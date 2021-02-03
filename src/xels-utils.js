'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const OPS = require('bitcoin-ops');
const secp256k1 = require('secp256k1');
const { sha256, hash160 } = require('./crypto');
const bip66 = require('bip66');
const bs58check = require('bs58check');
const varuint = require('varuint-bitcoin');
const pushdata = require('pushdata-bitcoin');
const BufferCursor = require('./buffer-cursor');


// buffer cloning 
function cloneBuffer(buffer) {
    let result = Buffer.alloc(buffer.length);
    buffer.copy(result);
    return result;
  }
  // transaction cloning with buffer data
  function cloneTx(tx) {
    let result = { version: tx.version, locktime: tx.locktime, vins: [], vouts: [] };
    for (let vin of tx.vins) {
      result.vins.push({
        txid: cloneBuffer(vin.txid),
        vout: vin.vout,
        hash: cloneBuffer(vin.hash),
        sequence: vin.sequence,
        script: cloneBuffer(vin.script),
        scriptPub: null,
      });
    }
    for (let vout of tx.vouts) {
      result.vouts.push({
        script: cloneBuffer(vout.script),
        value: vout.value,
      });
    }
    return result;
  }
  
  // refer to https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/script.js#L35
  function compileScript(chunks) {
    function asMinimalOP(buffer) {
      if (buffer.length === 0) return OPS.OP_0;
      if (buffer.length !== 1) return;
      if (buffer[0] >= 1 && buffer[0] <= 16) return OPS.OP_RESERVED + buffer[0];
      if (buffer[0] === 0x81) return OPS.OP_1NEGATE;
    }
  
    let bufferSize = chunks.reduce((accum, chunk) => {
      // data chunk
      if (Buffer.isBuffer(chunk)) {
        // adhere to BIP62.3, minimal push policy
        if (chunk.length === 1 && asMinimalOP(chunk) !== undefined) {
          return accum + 1;
        }
        return accum + pushdata.encodingLength(chunk.length) + chunk.length;
      }
      // opcode
      return accum + 1;
    }, 0.0);
  
    let buffer = Buffer.alloc(bufferSize);
    let offset = 0;
  
    chunks.forEach(chunk => {
      // data chunk
      if (Buffer.isBuffer(chunk)) {
        // adhere to BIP62.3, minimal push policy
        const opcode = asMinimalOP(chunk);
        if (opcode !== undefined) {
          buffer.writeUInt8(opcode, offset);
          offset += 1;
          return;
        }
  
        offset += pushdata.encode(buffer, chunk.length, offset);
        chunk.copy(buffer, offset);
        offset += chunk.length;
  
        // opcode
      } else {
        buffer.writeUInt8(chunk, offset);
        offset += 1;
      }
    });
    if (offset !== buffer.length) throw new Error('Could not decode chunks');
    return buffer;
  }
  
  // from address to public key gen by base58 decode algorithm
  function fromBase58Check(address) {
    let payload = bs58check.decode(address);
    let version = payload.readUInt8(0);
    let hash = payload.slice(1);
    return { version, hash };
  }
  exports.fromBase58Check = fromBase58Check;
  
  
  // refer to https://en.bitcoin.it/wiki/Transaction#General_format_of_a_Bitcoin_transaction_.28inside_a_block.29
  function calcTxBytes(vins, vouts) {
    return (
      4 + // version
      4 + // timestamp
      varuint.encodingLength(vins.length) +
      vins
        .map(vin => (vin.scriptSig ? vin.scriptSig.length : vin.script.length))
        .reduce((sum, len) => sum + 40 + varuint.encodingLength(len) + len, 0) +
      varuint.encodingLength(vouts.length) +
      vouts
        .map(vout => vout.script.length)
        .reduce((sum, len) => sum + 8 + varuint.encodingLength(len) + len, 0) +
      4 // locktime
    );
  }
  
  //generate final transaction buffer
  function txToBuffer(tx) {
    
    let buffer = Buffer.alloc(calcTxBytes(tx.vins, tx.vouts));
    let cursor = new BufferCursor(buffer);

    // version
    cursor.writeInt32LE(tx.version);

    //timestamp
    let time = Buffer.from(Math.round((new Date()).getTime() / 1000).toString(16),'hex').reverse();
    cursor.writeBytes(time);
    
    // vin length
    cursor.writeBytes(varuint.encode(tx.vins.length));
  
    // vin
    for (let vin of tx.vins) {
      cursor.writeBytes(vin.hash);
      cursor.writeUInt32LE(vin.vout);
      if (vin.scriptSig) {
        cursor.writeBytes(varuint.encode(vin.scriptSig.length));
        cursor.writeBytes(vin.scriptSig);
      } else {
        cursor.writeBytes(varuint.encode(vin.script.length));
        cursor.writeBytes(vin.script);
      }
      cursor.writeUInt32LE(vin.sequence);
    }
  
    // vout length
    cursor.writeBytes(varuint.encode(tx.vouts.length));
  
    // vouts
    for (let vout of tx.vouts) {
      cursor.writeUInt64LE(vout.value);
      cursor.writeBytes(varuint.encode(vout.script.length));
      cursor.writeBytes(vout.script);
    }
  
    // locktime
    cursor.writeUInt32LE(tx.locktime);
  
    return buffer;
  }
  exports.txToBuffer = txToBuffer;

  
  // refer to: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/script_signature.js= der encoding
  function toDER(x) {
    let i = 0;
    while (x[i] === 0) ++i;
    if (i === x.length) return Buffer.alloc(1);
    x = x.slice(i);
    if (x[0] & 0x80) return Buffer.concat([Buffer.alloc(1), x], 1 + x.length);
    return x;
  }
  
  // refer to: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/script_signature.js
  function encodeSig(signature, hashType) {
    const hashTypeMod = hashType & ~0x80;
    if (hashTypeMod <= 0 || hashTypeMod >= 4) throw new Error('Invalid hashType ' + hashType);
  
    const hashTypeBuffer = Buffer.from([hashType]);
  
    const r = toDER(signature.slice(0, 32));
    const s = toDER(signature.slice(32, 64));
  
    return Buffer.concat([bip66.encode(r, s), hashTypeBuffer]);
  }
  
  /////////////////////////////////////////
  //singing mechanism
  function signp2pkh(tx, vindex, privKey, hashType = 0x01) {
    let clone = cloneTx(tx);
  
    // clean up relevant script
    let filteredPrevOutScript = clone.vins[vindex].script.filter(op => op !== OPS.OP_CODESEPARATOR);
    clone.vins[vindex].script = filteredPrevOutScript;
  
    // zero out scripts of other inputs
    for (let i = 0; i < clone.vins.length; i++) {
      if (i === vindex) continue;
      clone.vins[i].script = Buffer.alloc(0);
    }
  
    // write to the buffer
    let buffer = txToBuffer(clone);
  
    // extend and append hash type
    buffer = Buffer.alloc(buffer.length + 4, buffer);
  
    // append the hash type
    buffer.writeInt32LE(hashType, buffer.length - 4);
  
    // double-sha256
    let hash = sha256(sha256(buffer));
  
    // sign input
    let sig = secp256k1.sign(hash, privKey);
  
    // encode
    return encodeSig(sig.signature, hashType);
  }
  exports.signp2pkh = signp2pkh;
  
  function p2pkhScriptSig(sig, pubkey) {
    return compileScript([sig, pubkey]);
  }
  exports.p2pkhScriptSig = p2pkhScriptSig;
  
  // Refer to:
  // https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/payments/p2pkh.js#L58
  function p2pkhScript(hash160PubKey) {
    // prettier-ignore
    return compileScript([
      OPS.OP_DUP,
      OPS.OP_HASH160,
      hash160PubKey,
      OPS.OP_EQUALVERIFY,
      OPS.OP_CHECKSIG
    ]);
  }
  exports.p2pkhScript = p2pkhScript;
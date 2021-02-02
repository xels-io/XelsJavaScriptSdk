const {sha256} = require('./crypto');
const createHash = require("create-hash");
const ec = require("elliptic").ec;
const ripemd160 = require('ripemd160');
const bs58check = require("bs58check");
const EVEN = ['0','2','4','6','8','A','C','E'];

function getPublicKey (privateKey,type='key'){
    const ecdsa = new ec('secp256k1'),
          keys = ecdsa.keyFromPrivate(privateKey),
          publicKey = keys.getPublic('hex');
        if(type == 'hash'){
            let hash = sha256(Buffer.from(publicKey, 'hex'));
            let publicKeyHash = new ripemd160().update(Buffer.from(hash, 'hex')).digest();
            return publicKeyHash;
        }
        
        let pubkey_y = keys.pub.y.toString('hex');
        pubkey_y = pubkey_y.split('');
        let prefix = (EVEN.includes(pubkey_y[pubkey_y.length-1]))?'02':'03';
        return prefix+keys.pub.x.toString('hex');
}

function getAddress (publicKey){
    const pubToSha256 = createHash('sha256').update(Buffer.from(publicKey,'hex')).digest(); // sha hash
    const sha256Tormd160 = createHash('rmd160').update(pubToSha256).digest(); // riped hash
    //add prefix 75 to hex that is 4b;
    const rmd160ToHexWithNetworkPrefix= "4b"+sha256Tormd160.toString("hex");
    //buffer hash with prefix hex value
    const dHashBuffer= Buffer.from(rmd160ToHexWithNetworkPrefix,'hex');

    //base 58 encode to get address
    const address = bs58check.encode(dHashBuffer);
    return address;
}


/// get wallet from private key
function fromPrivateKey(PKey) {

    let pub_key = getPublicKey(PKey);
    let address = getAddress(pub_key);
    let wallet  = {
        private_key: PKey,
        public_key: pub_key,
        address:address
    }
    return wallet;
}
exports.fromPrivateKey = fromPrivateKey;

function getWalelt(str='') {
    if(typeof str != 'string'){
        throw 'The parameter must be a string';
    }
    let PKey;
    if(str != '' && typeof str == 'string'){
        PKey = sha256(str).toString('hex');
    }else{
        let secureRandom = require('secure-random'),
        privateKey = secureRandom.randomBuffer(32);

        PKey = privateKey.toString('hex');
    }
    return fromPrivateKey(PKey);
}
exports.getWalelt = getWalelt;
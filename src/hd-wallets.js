const bip39 = require("bip39");
const hdkey = require("hdkey");
const createHash = require("create-hash");
const bs58check = require("bs58check");

exports.getWallets = function(mnemonic=''){
    
    let wallet = {
        mnemonic:'',
        seed:'',
        master_private_key:'',
        master_public_key:'',
        addresses:[],
    };
    if(mnemonic==''){
        //generates  memonic string randomly if string is not provide
        mnemonic = bip39.generateMnemonic()
    }
    
    wallet.mnemonic = mnemonic;
    const seed = bip39.mnemonicToSeedSync(mnemonic).toString('hex'); //creates seed buffer
    wallet.seed = seed;
    const root = hdkey.fromMasterSeed(seed);
    const masterPrivateKey = root.privateKey.toString('hex');
    wallet.master_private_key = masterPrivateKey.toString('hex');
    wallet.master_public_key = root._publicKey.toString('hex');


    const addrnode = root.derive("m/44'/0'/0'/0/0");
    const publicKey = addrnode._publicKey;
    const pubToSha256 = createHash('sha256').update(publicKey).digest(); // sha hash
    const sha256Tormd160 = createHash('rmd160').update(pubToSha256).digest(); // riped hash
    //add prefix 75 to hex that is 4b;
    const rmd160ToHexWithNetworkPrefix= "4b"+sha256Tormd160.toString("hex");
    //buffer hash with prefix hex value
    const dHashBuffer= Buffer.from(rmd160ToHexWithNetworkPrefix,'hex');

    //base 58 encode to get address
    const address = bs58check.encode(dHashBuffer);
    wallet.addresses.push({address,private_key:addrnode.privateKey.toString('hex')});
    return wallet;
}
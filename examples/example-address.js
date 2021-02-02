const xels = require('../src');

 let wallet1 = xels.address.getWalelt() //random
 console.log('Wallet(Random)',wallet1);

 let wallet2 = xels.address.fromPrivateKey('b8d2e31d5388b20e05aca753f03b80232625e164913f801d1f134752068d7052') //from private key
console.log('Wallet(From Private key)',wallet2);

 let wallet3 = xels.address.getWalelt('Random String') //from static string
 console.log('Wallet(From String)',wallet3);
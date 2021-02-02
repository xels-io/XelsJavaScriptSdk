const Xels = require('../src');


// let wallet1 = Wallet.getWallets(); //Random Mnemonics
// console.log('wallet (Random Mnemonics)',wallet1);

let wallet2 = Xels.HD.getWallets('earn range lawn spatial calm wave obscure adjust dilemma cross creek aunt'); //Random Mnemonics
console.log('wallet (Fixed Mnemonics)',wallet2);





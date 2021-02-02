const { Transaction } = require('../src')

let txobj = new Transaction()

let FEE = 10000; // in satoshi
let send_amount1 = 12*100000000; // in satoshi


// Adding a input.You can call this addInput method multiple times for multiple input
txobj.addInput([{
    txid:'2cb7296f7d55648450399f9be54afcf85ab58fdea4d718dbc324385a1d0e9c29',
    index: 1, //index of prev output
    satoshi:1000000000
},
{
    txid:'b0167a3358ec2da7e9e39cf208e6457155f7b8d712a2284eda1b514cdc80b4d3',
    index: 1, //index of prev output
    satoshi:700000000
}]);

// You can call this addOutput method multiple times for multiple output to send xels
txobj.addOutput('XLNey8QuBCyw9yGYskXwTq3L71nuR93qDX',send_amount1)

//If you sent satoshi to multiple addresses the total amount will be the sum of those.
let total_send_amount = send_amount1;

let change_amount = txobj.balance - (total_send_amount+FEE);

if(change_amount<0){
    throw 'Insufficient Balance: '+txobj.balance+' to send '+ total_send_amount +' XELS';
}

if(change_amount>0){
    txobj.addChange('XHYHDKzvc395ww59FYd83sRmCKyq2UEM7H',change_amount-FEE)
}


let private_key = '2e101e5274316c9cd0a7f2813cb2269b5c2415767e8015e88f3c178030abaddc';

//Signing all inputs
txobj.signInput(private_key);

let hex = txobj.toHex() // Need to publish this transaction hex

console.log('Hex',{hex});


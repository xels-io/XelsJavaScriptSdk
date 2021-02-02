const { Transaction } = require('../src')
const { XelsNode } = require('../src')

let xelsNode = new XelsNode('http://localhost:37221');

let txobj = new Transaction()

let FEE = 10000; // in satoshi
let send_amount1 = 7*100000000; // in satoshi
let from_address = 'XHYHDKzvc395ww59FYd83sRmCKyq2UEM7H';

xelsNode.getUtxos(from_address).then(utxos=>{
    txobj.addInput(utxos);

    // You can call this addOutput method multiple times for multiple output to send xels
    txobj.addOutput('XJTJcCgxmxZsnpzMs3APQFFT574JSMhYB9',send_amount1)
    
    //If you sent satoshi to multiple addresses the total amount will be the sum of those satoshi.
    let total_send_amount = send_amount1;
    
    let change_amount = txobj.balance - (total_send_amount+FEE);
    
    if(change_amount<0){
        throw 'Insufficient Balance: '+txobj.balance+' to send '+ total_send_amount +' XELS';
    }
    
    if(change_amount>0){
        txobj.addChange(from_address,change_amount-FEE)
    }
    
    
    let private_key = '2e101e5274316c9cd0a7f2813cb2269b5c2415767e8015e88f3c178030abaddc';
    
    //Signing all inputs
    txobj.signInput(private_key);
    
    let hex = txobj.toHex() // Need to publish this transaction hex

    xelsNode.broadcast(hex).then(resp=>{
        console.log(resp)
    }).catch(err=>{
        console.log(err);
    })
    
}).catch(err=>{
    console.log(err)
})



# XelsJavaScriptSdk
JavaScript code for build signed transaction and generating wallet and address

## **Create new address**


const xels = require('../src');

### Create wallet randomly
```javascript
 let wallet1 = xels.address.getWalelt() //random
 console.log('Wallet(Random)',wallet1);
```
### Create wallet from private key
```javascript
 let wallet2 = xels.address.fromPrivateKey(private_key) //from private key
console.log('Wallet(From Private key)',wallet2);
```
### Create wallet from random string
```javascript
 let wallet3 = xels.address.getWalelt('Random String') //from static string
 console.log('Wallet(From String)',wallet3);
 ```



## **Create a raw tranaction**
```javascript
 const { Transaction } = require('../src')

let txobj = new Transaction()

let FEE = 10000; // in satoshi
let send_amount1 = 12*100000000; // in satoshi
```

### Adding a input object.You can call this addInput method multiple times by object for multiple input or passing a array of object for multiple inputs
```javascript
txobj.addInput(utxos);
```
### You can call this addOutput method multiple times for multiple output to send xels
```javascript
txobj.addOutput(xels_address,send_amount1)

//If you sent satoshi to multiple addresses the total amount will be the sum of those.
let total_send_amount = send_amount1;
```

### Addd change address from getting change amount here

```javascript
let change_amount = txobj.balance - (total_send_amount+FEE);

if(change_amount<0){
    throw 'Insufficient Balance';
}

if(change_amount>0){
    txobj.addChange(chaneg_address,change_amount-FEE)
}

```



### Signing all inputs by sender private key
```javascript
txobj.signInput(private_key);
```
### Get hex string from broadcasting signed transaction
```javascript
let hex = txobj.toHex() // Need to publish this transaction hex

```
* You will get transaction id after broadcast a transaction*


## **Get UTXOS from xels node**
```javascript
let xelsNode = new XelsNode('http://localhost:37221');

xelsNode.getUtxos(from_address).then(utxos=>{
    console.log(utxos)
})
```
## **Broadcast Signed transaction hex**
```javascript
xelsNode.broadcast(hex).then(resp=>{
        console.log(resp)
    }).catch(err=>{
        console.log(err);
    })
```
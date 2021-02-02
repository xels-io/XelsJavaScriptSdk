const axios = require('axios');

class XelsNode {
    constructor(url='http://localhost:37221'){
        this.Node = axios.create({
            baseURL: url,
            timeout: 1000
          });
    }
    getUtxos(address){
        const GET_UTXO_URL = '/api/BlockStore/getverboseaddressesbalances?addresses='+address;
        let Node = this.Node;
        return new Promise((resolve,reject)=>{
            Node.get(GET_UTXO_URL).then(resp=>{
                let balanceChanges = resp.data.balancesData[0].balanceChanges;
                let inputsOutputs = {};
                let utxos = [];
                try{
                    for(let i in balanceChanges){
                        if(balanceChanges[i].deposited) inputsOutputs[balanceChanges[i].txHash] = {...balanceChanges[i],spend:false}
                        else inputsOutputs[balanceChanges[i].txHash].spend = true;
                      }
                      for(let k in inputsOutputs){
                        if(inputsOutputs[k].spend==false) utxos.push({
                          txid:inputsOutputs[k].txHash,
                          index:inputsOutputs[k].index,
                          satoshi:inputsOutputs[k].satoshi,
                          balanceChangedHeight:inputsOutputs[k].balanceChangedHeight
                        })
                      }
                }catch(err){
                    reject(err);
                }
                resolve(utxos);
              }).catch(err=>{
                  reject(err);
              });
        })
    }
    broadcast(hex){
        let BC_URL = '/api/Wallet/send-transaction',Node = this.Node;
        return new Promise((resolve,reject)=>{
            console.log(BC_URL)
            Node.post(BC_URL,{hex}).then(resp=>{
                resolve(resp.data);
            }).catch(err=>{
                reject(err);
            })
        })
    }

}

exports.XelsNode = XelsNode;
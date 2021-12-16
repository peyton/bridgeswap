import Connector from '@vite/connector';
import { constant, abi, accountBlock, utils, ViteAPI } from '@vite/vitejs';
import { contract_abi, contract_code } from '../utils/abi'

// send transaction via vite-connect
export async function sendTransactionAsync(accounts, vbInstanceG: Connector, ...args: any): Promise<any> {
  console.log("Sending transaction");
  console.log("instance", vbInstanceG)
  return new Promise((res, rej) => {
    vbInstanceG.on('disconnect', () => {
      rej("Request aborted due to disconnect.");
    });
    console.log("In promise")
    vbInstanceG.sendCustomRequest({ method: 'vite_signAndSendTx', params: args }).then((r: any) => {
      res(r);
    }).catch((e: any) => {
      rej(e);
    });
  });
}

// Call a contract with an on-chain function
export async function callOnChain(accounts, provider, vbInstance, method, params = [], tokenId = "tti_5649544520544f4b454e6e40", amount = '0') {
  console.log(method, params, tokenId, amount)
  const block = accountBlock.createAccountBlock('callContract', {
    address: accounts[0],
    abi: contract_abi,
    toAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
    methodName: method,
    params: params,
    tokenId: tokenId,
    amount: amount
  });
  block.setProvider(provider);
  await block.autoSetPreviousAccountBlock();
  console.log(block)

  const r = sendTransactionAsync(accounts, vbInstance, { block: block.accountBlock });
  return r;
}

// Call a contract with an off-chain function
export async function callOffChain(accounts, provider, method, params = []) {
  console.log(accounts, provider, method, params);
  const block = accountBlock.createAccountBlock('callContract', {
    address: accounts[0],
    abi: contract_abi,
    toAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
    methodName: method,
    params: params
  });
  console.log(block);

  const r = await provider.request('contract_callOffChainMethod', {
    "address": process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
    "code": contract_code,
    "data": block.data
  })

  return abi.decodeParameter('uint256', Buffer.from(r, 'base64').toString('hex'))
}

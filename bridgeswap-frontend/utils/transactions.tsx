import Connector from '@vite/connector';
import { constant, abi, accountBlock, utils, ViteAPI } from '@vite/vitejs';
import { contract_abi, contract_code, contract_address } from '../utils/abi'
// Only use this for anything related to accountBlocks; otherwise use the websockets provider

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

export async function callOnChain(accounts, provider, vbInstance, method, params, tokenId, amount) {
  const block = accountBlock.createAccountBlock('callContract', {
    address: accounts[0],
    abi: contract_abi,
    toAddress: contract_address,
    methodName: "deposit",
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

// Calls function from the pair contract
export async function callOffChain(accounts, provider, method, params) {
  console.log(accounts, provider, method, params);
  const block = accountBlock.createAccountBlock('callContract', {
    address: accounts[0],
    abi: contract_abi,
    toAddress: contract_address,
    methodName: method,
    params: params
  });
  console.log(block);

  const r = await provider.request('contract_callOffChainMethod', {
    "address": contract_address,
    "code": contract_code,
    "data": block.data
  })

  return abi.decodeParameter('uint256', Buffer.from(r, 'base64').toString('hex'))
}
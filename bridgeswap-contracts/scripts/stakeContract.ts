// @ts-ignore
import { WS_RPC } from '@vite/vitejs-ws';
// @ts-ignore
import { HTTP_RPC } from '@vite/vitejs-http';
import { wallet, accountBlock, ViteAPI, constant } from '@vite/vitejs';
import { deploy, awaitDeployConfirmed, DeployedContract } from '../src/contract'
import { CompileResult } from '../src/solppc'
import { compile } from '../src/compile'
import { issueToken, listTokensOwnedByAddress } from '../src/token'

const { getWallet } = wallet;
const { Vite_TokenId } = constant;

const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  process.exit(1)
}
const mywallet = getWallet(mnemonic);
const { privateKey, address } = mywallet.deriveAddress(0);

console.log("Here");

const { createAccountBlock, utils } = accountBlock;



function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}


const wsrpc = new WS_RPC('ws://localhost:41420');
console.log(wsrpc)
const provider = new ViteAPI(wsrpc, () => { console.log("connect") });

async function awaitReceived(hash: string) {
  let outputblock = undefined;
  while (!outputblock) {
    const thisBlock = await provider.request('ledger_getAccountBlockByHash', hash);
    if (!thisBlock?.receiveBlockHash) {
      await sleep(1000);
      continue
    }
    outputblock = thisBlock
  }
  return outputblock
}


async function _deployContract() {
  const compileResult: CompileResult = await compile("Bridgeswap.solpp")
  //  console.log("CompileResult", compileResult)
  const sendBlock = await deploy(
    provider,
    address,
    privateKey,
    compileResult.abis[0],
    compileResult.byteCodes[0],
    {
      responseLatency: 15
    }
  )

  console.log("Sent")
  const receiveblock = await awaitReceived(sendBlock.hash!);
  console.log("Received");
  const contract = new DeployedContract(
    provider,
    sendBlock.toAddress!,
    compileResult.abis[0],
    compileResult.offChainCodes[0]
  )
  console.log("ABI", JSON.stringify(compileResult.abis[0]));
  console.log("Contracthere", contract)
  return contract
}
async function mintToken() {
  console.log("Provider created", provider);
  const thiscontract: DeployedContract = await _deployContract();
  console.log("Contract:", thiscontract)
  const myAccountBlock = createAccountBlock('stakeForQuota', {
    address,
    beneficiaryAddress: thiscontract._address,
    //amount: '1000000000000000000000' // The minimum staking amount is 134 VITE
    amount: "5134000000000000000000"
  });
  myAccountBlock.setProvider(provider).setPrivateKey(privateKey);

  await myAccountBlock.autoSetPreviousAccountBlock();
  console.log("Here");
  const result = await myAccountBlock.sign().send();
  console.log('send success', result);
  //    await provider.request("miner_mine");    
  await awaitReceived(myAccountBlock.hash!);
  console.log("Pre add pair")
  let pairs = await thiscontract.callOffChain("getPairCount", [])
  console.log("Pairs before:", pairs)
  console.log("Initializing")
  const initializeBlock = await thiscontract.call(address, privateKey, "addPair", ["tti_80f3751485e4e83456059473", "tti_687d8a93915393b219212c73"], {})
  await awaitReceived(initializeBlock.hash!);
  console.log("Post add pair")
  pairs = await thiscontract.callOffChain("getPairCount", [])
  console.log("Pairs after:", pairs)
  /*const r1 = await issueToken(provider, address, privateKey, "TOKENONE", "TO")
  const r2 = await issueToken(provider, address, privateKey, "TOKENTWO", "TT")
  await awaitReceived(r1.hash!)
  await awaitReceived(r2.hash!)
  const tl = await listTokensOwnedByAddress(provider, address);
  console.log("Tokens", tl)*/
  return 0;
}

mintToken().catch((alert) => { console.log(alert); }).then(() => { console.log("Done") });

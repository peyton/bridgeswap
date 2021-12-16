// @ts-ignore
import { WS_RPC } from '@vite/vitejs-ws';
// @ts-ignore
import { HTTP_RPC } from '@vite/vitejs-http';
import { wallet, accountBlock, ViteAPI, constant } from '@vite/vitejs';

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

const myAccountBlock = createAccountBlock('stakeForQuota', {
    address,
    beneficiaryAddress: "vite_016ff5fd6edb227deffca52044040f6a47b6ebfd01753570f0",
    //amount: '1000000000000000000000' // The minimum staking amount is 134 VITE
    amount: "5134000000000000000000"
});

console.log(myAccountBlock)

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
}

async function mintToken() {
    console.log("Provider created", provider);
    myAccountBlock.setProvider(provider).setPrivateKey(privateKey);
    await myAccountBlock.autoSetPreviousAccountBlock();
    console.log("Here");
    const result = await myAccountBlock.sign().send();
    console.log('send success', result);
    //    await provider.request("miner_mine");
    await awaitReceived(myAccountBlock.hash!);
    return 0;
}

mintToken().catch((alert) => { console.log(alert); }).then(() => { console.log("Done") });

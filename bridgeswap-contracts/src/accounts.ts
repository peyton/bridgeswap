import { accountBlock, constant as viteConstant, wallet } from '@vite/vitejs'
import { ProviderType } from '@vite/vitejs/distSrc/utils/type'

import { network } from './config'
import { stakeQuota } from './contract'
import { accountHeight, mine } from './node'
import { signAndSend } from './provider'

function _listAccounts() {
  const walletInstance = wallet.getWallet(network.mnemonic)
  return walletInstance.deriveAddressList(0, 10)
}

async function _awaitInitAccount(
  provider: ProviderType,
  from: string,
  fromKey: string,
  to: string,
  toKey: string
) {
  if ((await accountHeight(provider, to)) > 0) {
    return;
  }
  const stakeResult = stakeQuota(provider, from, fromKey, to);
  await stakeResult;

  const tokenId = viteConstant.Vite_TokenId;
  const amount = '1';
  const block = accountBlock.createAccountBlock('send', {
    address: from,
    toAddress: to,
    tokenId: tokenId,
    amount: amount,
  });
  const sendResult = signAndSend(provider, block, fromKey);
  const receivedResult = _awaitReceiveAll(provider, to, toKey);
  await sendResult;
  await receivedResult;
  await mine(provider)
  await mine(provider)
  await mine(provider)
}

export function _accountUnreceivedBlocks(provider: any, account: string) {
  return provider.request(
    'ledger_getUnreceivedBlocksByAddress',
    account,
    0,
    100
  );
}


async function _awaitReceive(
  provider: ProviderType,
  address: string,
  key: string,
  sendHash: string
) {
  const block = accountBlock.createAccountBlock('receive', {
    address: address,
    sendBlockHash: sendHash,
  });
  return signAndSend(provider, block, key);
}

async function _awaitReceiveAll(
  provider: any,
  account: string,
  accountKey: string
) {
  const blocks = await _accountUnreceivedBlocks(provider, account);
  if (blocks) {
    for (const block of blocks) {
      await awaitReceive(provider, account, accountKey, block.hash);
    }
  }
}

export const awaitInitAccount = _awaitInitAccount
export const awaitReceive = _awaitReceive
export const awaitReceiveAll = _awaitReceiveAll
export default _listAccounts()


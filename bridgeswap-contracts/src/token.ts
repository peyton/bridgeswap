import { accountBlock } from '@vite/vitejs'
import { ProviderType } from '@vite/vitejs/distSrc/utils/type'
import { awaitConfirmed, awaitReceived, mine } from './node'

import { signAndSend } from './provider'

interface TokenInfo {
  tokenSymbol: string,
  tokenId: string
}

async function _listTokensOwnedByAddress(provider: ProviderType, address: string) {
  return provider.request('contract_getTokenInfoListByOwner', address)
}

async function _issueToken(
  provider: ProviderType,
  address: string,
  key: string,
  tokenName: string,
  tokenSymbol: string,
  decimals = 2,
  maxSupply = "1000000000000000000000000",
  totalSupply = "10000000000000000000000",
  isReIssuable = true,
  isOwnerBurnOnly = false,
) {
  const block = accountBlock.createAccountBlock('issueToken', {
    address: address,
    tokenName: tokenName,
    isReIssuable: isReIssuable,
    maxSupply: maxSupply,
    isOwnerBurnOnly: isOwnerBurnOnly,
    totalSupply: totalSupply,
    decimals: decimals,
    tokenSymbol: tokenSymbol
  })
  return signAndSend(provider, block, key)
}

async function _awaitIssueTokenConfirmed(
  provider: ProviderType,
  address: string,
  key: string,
  tokenName: string,
  tokenSymbol: string,
  decimals = 2,
  maxSupply = '1000000000000000000000000',
  totalSupply = '10000000000000000000000',
  isReIssuable = true,
  isOwnerBurnOnly = false,
) {
  const issueResult = await _issueToken(
    provider,
    address,
    key,
    tokenName,
    tokenSymbol,
    decimals,
    maxSupply,
    totalSupply,
    isReIssuable,
    isOwnerBurnOnly
  )
  const receivedBlock = await awaitReceived(provider, issueResult.hash!)
  await mine(provider)
  const confirmedBlock = await awaitConfirmed(provider, receivedBlock.receiveBlockHash!)
  return { send: receivedBlock, receive: confirmedBlock }
}

export { type TokenInfo }
export const awaitIssueTokenConfirmed = _awaitIssueTokenConfirmed
export const issueToken = _issueToken
export const listTokensOwnedByAddress = _listTokensOwnedByAddress

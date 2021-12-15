import { accountBlock } from '@vite/vitejs'
import { ProviderType } from '@vite/vitejs/distSrc/utils/type'

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
  maxSupply = "10000000000000000000000",
  totalSupply = "100000000000000000000",
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

export { type TokenInfo }
export const listTokensOwnedByAddress = _listTokensOwnedByAddress
export const issueToken = _issueToken

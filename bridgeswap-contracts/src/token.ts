import { ProviderType } from "@vite/vitejs/distSrc/utils/type";

interface TokenInfo {
  tokenSymbol: string,
  tokenId: string
}

async function _listTokensOwnedByAddress(provider: ProviderType, address: string) {
  return provider.request('contract_getTokenInfoListByOwner', address)
}

export { type TokenInfo }
export const listTokensOwnedByAddress = _listTokensOwnedByAddress


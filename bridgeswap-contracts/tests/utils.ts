import { BigNumber} from '@ethersproject/bignumber'
import { ViteAPI } from "@vite/vitejs/distSrc/utils/type";

async function _accountBalance(provider: ViteAPI, address: string, tokenId: string) {
  const { balance } = await provider.getBalanceInfo(address)
  return _balanceForTokenIdInBalances(balance, tokenId)
}

function _balanceForTokenIdInBalances(balances: { balanceInfoMap: any }, tokenId: any): BigNumber {
  return BigNumber.from(balances.balanceInfoMap[tokenId].balance)
}

export const accountBalance = _accountBalance
export const balanceForTokenIdInBalances = _balanceForTokenIdInBalances

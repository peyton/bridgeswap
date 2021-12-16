import Connector from '@vite/connector';
import { constant, abi, accountBlock, utils, ViteAPI } from '@vite/vitejs';
import { useState, useEffect } from 'react';
import { Typeahead } from 'react-bootstrap-typeahead'
import 'react-bootstrap-typeahead/css/Typeahead.css'
import { callOnChain, callOffChain } from '../utils/transactions'
import BigNumber from 'bignumber.js'
BigNumber.config({ EXPONENTIAL_AT: [-100, 100] })

interface PoolProps {
  vbInstance: Connector;
  provider: typeof ViteAPI;
  accounts: string[];
  contractAddress: string
}

interface TokenInfo {
  tokenName: string,
  tokenSymbol: string,
  totalSupply: string,
  decimals: number,
  owner: string,
  tokenId: string,
  maxSupply: string,
  isReIssuable: boolean,
  index: number,
  isOwnerBurnOnly: boolean
}

interface TokenInfoListResponse {
  tokenInfoList: TokenInfo[],
  totalCount: number
}

// @dev Returns `amount` shifted by the number of decimals in tokenInfo.
function _tokenAmount(amount: number | string | BigNumber, tokenInfo: TokenInfo) {
  return (new BigNumber(amount)).shiftedBy(tokenInfo.decimals)
}

const Pool = ({ vbInstance, provider, accounts, contractAddress }: PoolProps) => {

  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>();
  const [tokenA, setTokenA] = useState<string[]>([]);
  const [tokenB, setTokenB] = useState<string[]>([]);
  const [tokensChosen, setTokensChosen] = useState(false);
  const [bankBalanceA, setBankBalanceA] = useState<number | undefined>(undefined);
  const [bankBalanceB, setBankBalanceB] = useState<number | undefined>(undefined);

  useEffect(() => {
    const getalltokens = async () => {
      let total_list: TokenInfo[] = [];
      const first_set: TokenInfoListResponse = await provider.request('contract_getTokenInfoList', 0, 10);
      const total = first_set.totalCount;
      total_list = total_list.concat(first_set.tokenInfoList);
      let index = 1;
      while (total_list.length < total) {
        const s: TokenInfoListResponse = await provider.request('contract_getTokenInfoList', index, 10);
        total_list = total_list.concat(s.tokenInfoList);
      }
      let token_map = new Map<string, TokenInfo>();
      for (let item of total_list) {
        token_map.set(item.tokenSymbol, item)
      }
      return token_map
    }
    getalltokens().then((m: Map<string, TokenInfo>) => {
      setTokenMap(m);
    })
  }, [])

  function updateBalancesAB() {
    callOffChain(accounts, provider, "getHoldingPoolBalance", [accounts[0], tokenMap.get(tokenA[0]).tokenId]).then(setBankBalanceA);
    callOffChain(accounts, provider, "getHoldingPoolBalance", [accounts[0], tokenMap.get(tokenB[0]).tokenId]).then(setBankBalanceB);
  }

  const chooseTokens = async () => {
    if (tokenA.length > 0 && tokenB.length > 0 && tokenA[0] !== tokenB[0] && tokenA[0].length > 0 && tokenB[0].length > 0) {
      setTokensChosen(true);
    } // TODO: Don't fail silently here

    updateBalancesAB();
  }

  function deposit(token, amount: number | string | BigNumber) {
    if (!tokenMap) {
      console.error('Token map not loaded')
      return
    }
    const tokenInfo: TokenInfo = tokenMap.get(token)!
    if (!tokenInfo) {
      console.error(`No info for token ${token}`)
      return
    }
    console.log(`Depositing ${amount} of ${tokenInfo.tokenId}`)
    const amountInTokenUnits = _tokenAmount(amount, tokenInfo)
    callOnChain(
      accounts,
      provider,
      vbInstance,
      "deposit",
      [],
      tokenInfo.tokenId,
      amountInTokenUnits.toString()
    ).then((result) => console.log(result)).catch((err) => console.log(err));
  }

  if (tokenMap === undefined || tokenMap.size == 0) {
    return <div>Loading tokens...</div>
  }
  // First, user selects token pair. Then they can deposit tokens, viewing their bank balance. Then they can add liquidity.  
  else if (tokenA.length == 0 || tokenB.length == 0 || !tokensChosen) {
    return (
      <div>
        <h1>Choose Pairs</h1>
        <Typeahead
          id="token-one"
          labelKey="Token One"
          options={Array.from(tokenMap.keys())}
          onChange={setTokenA}
          selected={tokenA}
          placeholder="Select first token"
        />
        <Typeahead
          id="token-two"
          labelKey="Token Two"
          options={Array.from(tokenMap.keys())}
          onChange={setTokenB}
          selected={tokenB}
          placeholder="Select second token"
        />
        <button onClick={chooseTokens}>Choose</button>
      </div>
    )
  }
  // Next - user views current deposit amount for each, can deposit more as well.
  // As well - user can explicitly add/remove liquidity  
  else {

    return (
      <div>
        <h1>Deposit Pairs</h1>
        <div>
          <h2>{tokenA[0]}</h2>
          <p>Balance: {bankBalanceA}</p>
          <button onClick={() => deposit(tokenA[0], 10)}>Deposit 10 {tokenA[0]}</button>
        </div>
        <div>
          <h2>{tokenB[0]}</h2>
          <p>Balance: {bankBalanceB}</p>
          <button onClick={() => deposit(tokenB[0], 10)}>Deposit 10 {tokenB[0]}</button>
        </div>
      </div>
    )
  }
}

export default Pool

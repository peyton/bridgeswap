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
  pageNav: () => void;
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


function _displayAmount(tokenAmount: number | string | BigNumber, tokenInfo: TokenInfo) {
  return (new BigNumber(tokenAmount)).shiftedBy(-tokenInfo.decimals)
}

const Pool = ({ pageNav, vbInstance, provider, accounts, contractAddress }: PoolProps) => {

  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>();
  const [tokenA, setTokenA] = useState<string[]>([]);
  const [tokenB, setTokenB] = useState<string[]>([]);
  const [tokensChosen, setTokensChosen] = useState(false);
  const [bankBalanceA, setBankBalanceA] = useState<number | undefined>(undefined);
  const [bankBalanceB, setBankBalanceB] = useState<number | undefined>(undefined);
  const [liquidity, setLiquidity] = useState<number | undefined>(undefined);

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
    updateLiquidityStakeAB()
  }

  function updateLiquidityStakeAB() {
    const tokenIds = [tokenMap.get(tokenA[0]).tokenId, tokenMap.get(tokenB[0]).tokenId]
    callOffChain(accounts, provider, "getLiquidityPoolBalance", [accounts[0], tokenIds[0], tokenIds[1]]).then(setLiquidity);
  }



  const chooseTokens = async () => {
    if (tokenA.length > 0 && tokenB.length > 0 && tokenA[0] !== tokenB[0] && tokenA[0].length > 0 && tokenB[0].length > 0) {
      setTokensChosen(true);
    } // TODO: Don't fail silently here

    updateBalancesAB();
    updateLiquidityStakeAB();
  }

  function _stringForBalance(balance: string | number | BigNumber, token: string) {
    if (!tokenMap) {
      console.error('Token map not loaded')
      return ''
    }
    const tokenInfo: TokenInfo = tokenMap.get(token)!
    if (!tokenInfo) {
      console.error(`No info for token ${token}`)
      return ''
    }
    return _displayAmount(balance, tokenInfo).toString()
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

  function addLiquidity() {
    updateBalancesAB();
    if (bankBalanceA == 0 || bankBalanceB == 0) {
      return window.alert('Deposit more tokens - each must have a nonzero balance')
    }
    const tokenIds = [tokenMap.get(tokenA[0]).tokenId, tokenMap.get(tokenB[0]).tokenId]
    callOnChain(accounts, provider, vbInstance, "addLiquiditySwap", [tokenIds[0], bankBalanceA.toString(), tokenIds[1], bankBalanceB.toString(), "1000000"]).then((result) => {
      updateLiquidityStakeAB();
    });
  }

  function formatToken(token, amount) {
    if (!tokenMap) {
      console.error('Token map not loaded')
      return
    }
    const tokenInfo: TokenInfo = tokenMap.get(token)!
    if (!tokenInfo) {
      console.error(`No info for token ${token}`)
      return
    }
    const amountInTokenUnits = _tokenAmount(amount, tokenInfo)
    return amountInTokenUnits.toString()
  }

  function withdraw(token, amount: number | string | BigNumber) {
    if (!tokenMap) {
      console.error('Token map not loaded')
      return
    }
    const tokenInfo: TokenInfo = tokenMap.get(token)!
    if (!tokenInfo) {
      console.error(`No info for token ${token}`)
      return
    }
    const amountInTokenUnits = _tokenAmount(amount, tokenInfo)
    callOnChain(accounts, provider, vbInstance, "withdraw", [amountInTokenUnits.toString(), tokenInfo.tokenId])
  }

  function removeLiquidity() {
    // removes all liquidity
    const tokenIds = [tokenMap.get(tokenA[0]).tokenId, tokenMap.get(tokenB[0]).tokenId]
    callOnChain(accounts, provider, vbInstance, "removeLiquidity", [liquidity, tokenIds[0], "1", tokenIds[1], "1", "10000"]).then(updateLiquidityStakeAB);
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
  // Next - user can add/remove liquidity
  else {

    return (
      <div>
        <h1>Deposit Pairs</h1>
        <div>
          <h2>{tokenA[0]}</h2>

          <p>Balance: {_stringForBalance(bankBalanceA, tokenA[0])}</p>
          <button onClick={() => deposit(tokenA[0], 10)}>Deposit 10 {tokenA[0]}</button>
          <button onClick={() => withdraw(tokenA[0], 10)}>Withdraw 10 {tokenA[0]}</button>
        </div>
        <div>
          <h2>{tokenB[0]}</h2>
          <p>Balance: {_stringForBalance(bankBalanceB, tokenB[0])}</p>
          <button onClick={() => deposit(tokenB[0], 10)}>Deposit 10 {tokenB[0]}</button>
          <button onClick={() => withdraw(tokenB[0], 10)}>Withdraw 10 {tokenB[0]}</button>
        </div >
        <button onClick={updateBalancesAB}>Update Balances</button>
        <div>
          <h2>Add Liquidity from balance</h2>
          <p>Liquidity balance: {liquidity === undefined ? "loading..." : liquidity}</p>
          <button onClick={addLiquidity}>Add balance to liquidity</button>
          <button onClick={removeLiquidity}>remove all liquidity</button>
        </div>
      </div >
    )
  }
}

export default Pool

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
  contractAddress: string;
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
  const [outputAmount, setOutputAmount] = useState("0");
  const [outputQuote, setOutputQuote] = useState("");
  const [maxInput, setMaxInput] = useState("0");
  const [confirmed, setConfirmed] = useState(false);

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

  const chooseTokens = async () => {
    if (tokenA.length > 0 && tokenB.length > 0 && tokenA[0] !== tokenB[0] && tokenA[0].length > 0 && tokenB[0].length > 0) {
      setTokensChosen(true);
    }
    // Get price from contract
    const token = tokenA[0];
    const tokenIds = [tokenMap.get(tokenA[0]).tokenId, tokenMap.get(tokenB[0]).tokenId]
    if (!tokenMap) {
      console.error('Token map not loaded')
      return
    }
    const tokenInfo: TokenInfo = tokenMap.get(token)!
    if (!tokenInfo) {
      console.error(`No info for token ${token}`)
      return
    }
    callOffChain(accounts, provider, "getSellRate", [tokenIds[0], _tokenAmount(outputAmount, tokenInfo).toString(), tokenIds[1]]).then(setOutputQuote);
  }

  function confirm() {
    const token = tokenA[0];
    const tokenIds = [tokenMap.get(tokenA[0]).tokenId, tokenMap.get(tokenB[0]).tokenId]
    if (!tokenMap) {
      console.error('Token map not loaded')
      return
    }
    const tokenInfo: TokenInfo = tokenMap.get(token)!
    if (!tokenInfo) {
      console.error(`No info for token ${token}`)
      return
    }
    const token2 = tokenB[0];
    const tokenInfo2: TokenInfo = tokenMap.get(token2)!
    if (!tokenInfo) {
      console.error(`No info for token ${token}`)
      return
    }
    callOnChain(accounts, provider, vbInstance, "swapOutput", [tokenIds[0], _tokenAmount(outputAmount, tokenInfo).toString(), "100000000"], tokenIds[1], _tokenAmount(maxInput, tokenInfo2).toString()).then((result) => setConfirmed(true));
  }

  interface EventTarget {
    value: string
  }

  interface InputEvent {
    target: EventTarget
  }


  function handleInputChange(event: InputEvent) {
    setOutputAmount(event.target.value)
  }

  function handleMaxChange(event: InputEvent) {
    setMaxInput(event.target.value)
  }

  if (tokenMap === undefined || tokenMap.size == 0) {
    return <div>Loading tokens...</div>
  }
  // Token A is the token being bought, token B is the token being sold
  // First, user selects token pair. Then they can deposit tokens, viewing their bank balance. Then they can add liquidity.  
  else if (tokenA.length == 0 || tokenB.length == 0 || !tokensChosen) {
    return (
      <div>
        <h1>Token to buy:</h1>
        <Typeahead
          id="token-one"
          labelKey="Token One"
          options={Array.from(tokenMap.keys())}
          onChange={setTokenA}
          selected={tokenA}
          placeholder="Select first token"
        />
        <h1>Token to sell:</h1>
        <Typeahead
          id="token-two"
          labelKey="Token Two"
          options={Array.from(tokenMap.keys())}
          onChange={setTokenB}
          selected={tokenB}
          placeholder="Select second token"
        />
        <h1>How many do you want to buy?</h1>
        <input type="text" value={outputAmount} onChange={handleInputChange} />
        <button onClick={chooseTokens}>Select</button>
      </div>
    )
  }
  // Next - user views current deposit amount for each, can deposit more as well.
  // As well - user can explicitly add/remove liquidity
  else if (!confirmed) {

    return (
      <div>
        <h1>Confirm Swap</h1>
        <p>Current exchange rate for {outputAmount} {tokenA[0]}: {_displayAmount(outputQuote, tokenMap.get(tokenB[0])).toString()} {tokenB[0]}</p>
        <h1>Please set the max amount that you are willing to spend, including fees (probably close to this exchange rate)</h1>
        <input type="text" value={maxInput} onChange={handleMaxChange} />
        <button onClick={confirm}>Confirm</button>
      </div>
    )
  }
  else {
    return (
      <div>
        <p>Success! Check your wallet transactions.</p>
        <button onClick={pageNav}>Go to pool</button>
      </div>
    )
  }
}

export default Pool

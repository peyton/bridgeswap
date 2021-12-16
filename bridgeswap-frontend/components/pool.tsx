import Connector from '@vite/connector';
import { constant, abi, accountBlock, utils, ViteAPI } from '@vite/vitejs';
import { useState, useEffect } from 'react';
import { Typeahead } from 'react-bootstrap-typeahead'
import 'react-bootstrap-typeahead/css/Typeahead.css'
import contract_abi from '../utils/abi'
import sendTransactionAsync from '../utils/transactions'

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

  const chooseTokens = () => {
    if (tokenA.length > 0 && tokenB.length > 0 && tokenA[0] !== tokenB[0] && tokenA[0].length > 0 && tokenB[0].length > 0) {
      setTokensChosen(true);
    } // TODO: Don't fail silently here

    console.log(tokenMap)

    // Replace the below with a simple offchain provider.request

    let block = accountBlock.createAccountBlock('callContract', {
      address: accounts[0],
      abi: contract_abi,
      toAddress: contractAddress,
      methodName: "getBalanceAddressToken",
      params: [accounts[0], tokenMap.get(tokenA[0]).tokenId]
    })

    sendTransactionAsync(vbInstance, {
      block: block.accountBlock
    }).then((result) => console.log(result));



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
        <h1>Choose Pairs</h1>

      </div>
    )
  }
}

export default Pool

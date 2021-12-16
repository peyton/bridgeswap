import Connector from '@vite/connector';
import { constant, abi, accountBlock, utils, ViteAPI } from '@vite/vitejs';
import { useState, useEffect } from 'react';
import { Typeahead } from 'react-bootstrap-typeahead'
import 'react-bootstrap-typeahead/css/Typeahead.css'

interface PoolProps {
  vbInstance: Connector;
  provider: typeof ViteAPI;
  accounts: string[];
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

const Pool = ({ vbInstance, provider, accounts }: PoolProps) => {

  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>();
  const [tokenA, setTokenA] = useState<string[]>([]);
  const [tokenB, setTokenB] = useState<string[]>([]);

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


  if (tokenMap === undefined || tokenMap.size == 0) {
    return <div>Loading tokens...</div>
  }
  // First, user selects token pair. Then they can deposit tokens, viewing their bank balance. Then they can add liquidity.  
  else if (tokenA.length == 0 || tokenB.length == 0) {
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
      </div>
    )
  }
  // TODO - disallow choosing the same token twice
  else {

    return (
      <div>
        <h1>Choose Pairs</h1>

      </div>
    )
  }
}

export default Pool

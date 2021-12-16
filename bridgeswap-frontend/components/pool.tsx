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

  const chooseTokens = async () => {
    if (tokenA.length > 0 && tokenB.length > 0 && tokenA[0] !== tokenB[0] && tokenA[0].length > 0 && tokenB[0].length > 0) {
      setTokensChosen(true);
    } // TODO: Don't fail silently here

    console.log(tokenMap)

    // Replace the below with a simple offchain provider.request

    const block = accountBlock.createAccountBlock('callContract', {
      address: accounts[0],
      abi: contract_abi,
      toAddress: contractAddress,
      methodName: "getBalanceAddressToken",
      params: [accounts[0], tokenMap.get(tokenA[0]).tokenId]
    });
    console.log(block);

    const r = await provider.request('contract_callOffChainMethod', {
      "address": contractAddress,
      "code": Buffer.from("608060405260043610610066576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff1680635fba01ca146100685780638e6d77a01461008d5780639f8fe856146100fd578063cdbd37b61461015257610066565b005b610070610174565b604051808381526020018281526020019250505060405180910390f35b6100e7600480360360408110156100a45760006000fd5b81019080803574ffffffffffffffffffffffffffffffffffffffffff169060200190929190803569ffffffffffffffffffff169060200190929190505050610191565b6040518082815260200191505060405180910390f35b61010561021a565b604051808369ffffffffffffffffffff1669ffffffffffffffffffff1681526020018269ffffffffffffffffffff1669ffffffffffffffffffff1681526020019250505060405180910390f35b61015a61025d565b604051808215151515815260200191505060405180910390f35b600060006003600050546004600050549150915061018d565b9091565b6000600760005060008474ffffffffffffffffffffffffffffffffffffffffff1674ffffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002160005060000160005060008369ffffffffffffffffffff1669ffffffffffffffffffff168152602001908152602001600021600050549050610214565b92915050565b60006000600260009054906101000a900469ffffffffffffffffffff166002600a9054906101000a900469ffffffffffffffffffff1691509150610259565b9091565b6000600260149054906101000a900460ff169050610276565b9056fea165627a7a72305820796422311ceab9e8ffcd94f6d0460b57a00f8ed0adf259abadaac0cd0bcdce590029", 'hex').toString('base64'),
      "data": block.data
    })
    //      "code"<tokenMap.get(tokenA[0]).tokenId)


    console.log(r)
    console.log(abi.decodeParameter('uint256', Buffer.from(r, 'base64').toString('hex')))
    // ^ This works, should be refactored

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

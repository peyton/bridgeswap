import { describe } from "mocha";
import { assert, expect } from "chai";

import {
  DeployedContract,
  awaitDeployConfirmed,
  autoReceive,
  CallProps
} from "../src/contract";
import { mine } from "../src/node";
import accounts from "../src/accounts";
import config from '../src/vitejs.config.json'
import { compile } from "../src/compile";
import { newProvider } from "../src/provider";
import { 
  type TokenInfo,
  issueToken,
  listTokensOwnedByAddress
} from '../src/token'
import { type CompileResult } from '../src/solppc'
import { ViteAPI } from "@vite/vitejs/distSrc/utils/type";

describe("swap test", function() {
  this.timeout(20000)
  let provider: ViteAPI
  let compileResult: CompileResult
  const firstAccount = accounts[0]

  before('create provider', () => {
    provider = newProvider(config.networks.local.url)
  })

  before('compile singlepair', async () => {
    await mine(provider)
    compileResult = await compile("singlepair.solpp")
    expect(compileResult.abis).to.be.not.empty
    expect(compileResult.byteCodes).to.be.not.empty
    expect(compileResult.offChainCodes).to.be.not.empty
  })

  async function _deployContract() {
    const { send: sendBlock, receive: receiveBlock } = await awaitDeployConfirmed(
      provider,
      firstAccount.address,
      firstAccount.privateKey,
      compileResult.abis[0],
      compileResult.byteCodes[0],
      {
        responseLatency: 1
      }
    )

    const contract = new DeployedContract(
      provider,
      receiveBlock.address,
      compileResult.abis[0],
      compileResult.offChainCodes[0]
    )

    autoReceive(provider, firstAccount.address, firstAccount.privateKey); // If this is not started, tokens will not actually be received - MUST run
    await issueToken(
      provider,
      firstAccount.address,
      firstAccount.privateKey,
      "TOKENONE",
      "TO"
    )
    await issueToken(
      provider,
      firstAccount.address,
      firstAccount.privateKey,
      "TOKENTWO",
      "TT"
    )

    await mine(provider)
    await mine(provider)

    let tokenIdA;
    let tokenIdB;
    const tokenlist: [TokenInfo] = await listTokensOwnedByAddress(provider, firstAccount.address)
    for (let { tokenId, tokenSymbol } of tokenlist) {
      if (tokenSymbol === "TT") {
        tokenIdB = tokenId;
      }
      if (tokenSymbol === "TO") {
        tokenIdA = tokenId;
      }
    }

    await contract.awaitCall(
      firstAccount.address,
      firstAccount.privateKey,
      'initialize',
      [tokenIdA, tokenIdB],
      {}
    )

    return { contract, tokenIdA, tokenIdB }
  }

  it('basic swap input, correct supply', async () => {
    await mine(provider)
    const { contract, tokenIdA, tokenIdB } = await _deployContract()
    async function _call(methodName: string, params: any[], props: CallProps) {
      return contract.awaitCall(
        firstAccount.address,
        firstAccount.privateKey,
        methodName,
        params,
        props
      )
    }

    await _call( 
      'deposit', 
      [], 
      { tokenId: tokenIdA, amount: '5000000000000000000' }
    )
    await _call(  
      'deposit', 
      [], 
      { tokenId: tokenIdB, amount: '10000000000000000000' }
    )
    await _call( 
      'addLiquidity', 
      ['5000000000000000000', '10000000000000000000'], 
      {}
    )
    
    await mine(provider)
    await mine(provider)
    await mine(provider)
    await mine(provider)
    const pairsupply = await contract.callOffChain('getPairSupply', []);
    expect(pairsupply).to.not.be.null
    expect(pairsupply![0]).equal('5000000000000000000');
    expect(pairsupply![1]).equal('10000000000000000000');

    const result = await _call(
      'swapInput',
      ['1', '48934'],
      { tokenId: tokenIdA, amount: '1000000000000000000' }
    )

    await mine(provider)
    await mine(provider)
    await mine(provider)
    await mine(provider)
    let supplyAfter = await contract.callOffChain('getPairSupply', []);
    expect(supplyAfter).to.not.be.null
    expect(supplyAfter![0]).equal('6000000000000000000');
    expect(supplyAfter![1]).equal('8337502084375521094');
  }).timeout(60000)

  it('basic swap input, correct account balance')

  it('basic swap output, correct supply')
  it('basic swap output, correct account balance')
})



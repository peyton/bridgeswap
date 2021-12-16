import { describe } from 'mocha'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
chai.use(solidity)

import { ViteAPI } from '@vite/vitejs/distSrc/utils/type'
import { CompileResult } from '../src/solppc'
import accounts, { awaitInitAccount, awaitReceiveAll } from '../src/accounts'
import { newProvider } from '../src/provider'
import config from '../src/vitejs.config.json'
import { compile } from '../src/compile'
import { mine } from '../src/node'
import { awaitDeployConfirmed, CallProps, DeployedContract } from '../src/contract'
import { awaitIssueTokenConfirmed, TokenInfo, listTokensOwnedByAddress } from '../src/token'
import { accountBalance } from './utils'
import { BigNumber } from 'ethers'

describe('bridgeswap tests', () => {
  describe('pair swap tests', function() {
    this.timeout(20000)
    let provider: ViteAPI
    let compileResult: CompileResult
    const firstAccount = accounts[0]
    const secondAccount = accounts[1]
    
    let tokenIdA: string
    let tokenIdB: string
    let tokenIdC: string

    before('create provider', () => {
      provider = newProvider(config.networks.local.url)
    })
  
    before('compile Bridgeswap', async () => {
      await mine(provider)
      compileResult = await compile("Bridgeswap.solpp")
      expect(compileResult.abis).to.be.not.empty
      expect(compileResult.byteCodes).to.be.not.empty
      expect(compileResult.offChainCodes).to.be.not.empty
    })

    before('initialize accounts', async () => {
      await awaitInitAccount(
        provider,
        accounts[0].address,
        accounts[0].privateKey,
        accounts[1].address,
        accounts[1].privateKey
      );
      await awaitInitAccount(
        provider,
        accounts[0].address,
        accounts[0].privateKey,
        accounts[2].address,
        accounts[2].privateKey
      )
      await mine(provider);
      await mine(provider);
    })

    before('issue tokens', async () => {
      await awaitIssueTokenConfirmed(
        provider,
        firstAccount.address,
        firstAccount.privateKey,
        "TOKENONE",
        "TO"
      )
      await awaitIssueTokenConfirmed(
        provider,
        firstAccount.address,
        firstAccount.privateKey,
        "TOKENTWO",
        "TT"
      )
      await awaitIssueTokenConfirmed(
        provider,
        firstAccount.address,
        firstAccount.privateKey,
        "TOKENTHREE",
        "TQ"
      )
  
      await mine(provider)
      await mine(provider)

      await awaitReceiveAll(provider, firstAccount.address, firstAccount.privateKey)
  
      const tokenlist: [TokenInfo] = await listTokensOwnedByAddress(provider, firstAccount.address)
      for (let { tokenId, tokenSymbol } of tokenlist) {
        if (tokenSymbol === "TO") {
          tokenIdA = tokenId;
        }
        if (tokenSymbol === "TT") {
          tokenIdB = tokenId;
        }
        if (tokenSymbol === "TQ") {
          tokenIdC = tokenId;
        }
      }
    })

    async function _deployContractAndAddPairs() {
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
  
      const pairA = [tokenIdA, tokenIdB]
      const pairB = [tokenIdA, tokenIdC]

      await contract.awaitCall(
        firstAccount.address,
        firstAccount.privateKey,
        'addPair',
        pairA,
        {}
      )

      await contract.awaitCall(
        firstAccount.address,
        firstAccount.privateKey,
        'addPair',
        pairB,
        {}
      )

      return { contract, pairA, pairB }
    }

    it('basic swap input, correct supply', async () => {
      await mine(provider)
      const { contract } = await _deployContractAndAddPairs()
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
        [ 
          tokenIdA, 
          '5000000000000000000', 
          tokenIdB,
          '10000000000000000000', 
          '4924389293'
        ], 
        {}
      )
      
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await _call(
        'swapInput',
        [
          tokenIdB,
          '1', 
          '48934'
        ],
        { tokenId: tokenIdA, amount: '1000000000000000000' }
      )
  
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      let supplyAfter = await contract.callOffChain('getPairSupply', [tokenIdA, tokenIdB]);
      expect(supplyAfter).to.not.be.null
      expect(supplyAfter![0]).equal('6000000000000000000');
      expect(supplyAfter![1]).equal('8337502084375521094');
    }).timeout(60000)

    it('basic swap input, correct account balance', async () => {
      await mine(provider)
      const { contract } = await _deployContractAndAddPairs()
      async function _call(methodName: string, params: any[], props: CallProps) {
        return contract.awaitCall(
          firstAccount.address,
          firstAccount.privateKey,
          methodName,
          params,
          props
        )
      }
  
      await awaitReceiveAll(provider, firstAccount.address, firstAccount.privateKey)
      const initialBalanceA = await accountBalance(provider, firstAccount.address, tokenIdA)
      const initialBalanceB = await accountBalance(provider, firstAccount.address, tokenIdB)

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
        [ 
          tokenIdA, 
          '5000000000000000000', 
          tokenIdB,
          '10000000000000000000', 
          '4924389293'
        ], 
        {}
      )
      
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await _call(
        'swapInput',
        [
          tokenIdB,
          '1', 
          '48934'
        ],
        { tokenId: tokenIdA, amount: '1000000000000000000' }
      )
  
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      
      await awaitReceiveAll(provider, firstAccount.address, firstAccount.privateKey)
      const finalBalanceA = await accountBalance(provider, firstAccount.address, tokenIdA)
      const finalBalanceB = await accountBalance(provider, firstAccount.address, tokenIdB)
      expect(initialBalanceA.sub(finalBalanceA)).to.equal(BigNumber.from('6000000000000000000'))
      expect(initialBalanceB.sub(finalBalanceB)).to.equal(BigNumber.from('8337502084375521094'))
    }).timeout(60000)

    it('basic swap output, correct supply', async () => {
      await mine(provider)
      const { contract } = await _deployContractAndAddPairs()
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
        [ 
          tokenIdA, 
          '5000000000000000000', 
          tokenIdB,
          '10000000000000000000', 
          '4924389293'
        ], 
        {}
      )
      
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await _call(
        'swapOutput',
        [
          tokenIdB,
          '1662497915624478906', 
          '48934'
        ],
        { tokenId: tokenIdA, amount: '2000000000000000000' }
      )
  
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      let supplyAfter = await contract.callOffChain('getPairSupply', [tokenIdA, tokenIdB]);
      expect(supplyAfter).to.not.be.null
      expect(supplyAfter![0]).equal('6000000000000000000');
      expect(supplyAfter![1]).equal('8337502084375521094');
    }).timeout(60000)

    it('basic swap output, correct account balance', async () => {
      await mine(provider)
      const { contract } = await _deployContractAndAddPairs()
      async function _call(methodName: string, params: any[], props: CallProps) {
        return contract.awaitCall(
          firstAccount.address,
          firstAccount.privateKey,
          methodName,
          params,
          props
        )
      }
  
      await awaitReceiveAll(provider, firstAccount.address, firstAccount.privateKey)
      const initialBalanceA = await accountBalance(provider, firstAccount.address, tokenIdA)
      const initialBalanceB = await accountBalance(provider, firstAccount.address, tokenIdB)

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
        [ 
          tokenIdA, 
          '5000000000000000000', 
          tokenIdB,
          '10000000000000000000', 
          '4924389293'
        ], 
        {}
      )
      
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await _call(
        'swapOutput',
        [
          tokenIdB,
          '1662497915624478906', 
          '48934'
        ],
        { tokenId: tokenIdA, amount: '2000000000000000000' }
      )
  
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      
      await awaitReceiveAll(provider, firstAccount.address, firstAccount.privateKey)
      const finalBalanceA = await accountBalance(provider, firstAccount.address, tokenIdA)
      const finalBalanceB = await accountBalance(provider, firstAccount.address, tokenIdB)
      expect(initialBalanceA.sub(finalBalanceA)).to.equal(BigNumber.from('6000000000000000000'))
      expect(initialBalanceB.sub(finalBalanceB)).to.equal(BigNumber.from('8337502084375521094'))
    }).timeout(60000)
  })
})

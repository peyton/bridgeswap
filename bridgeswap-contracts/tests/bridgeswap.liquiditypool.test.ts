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
  describe('pair liquidity pool tests', function() {
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

    it('holding pool roundtrip', async () => {
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

      await _call('deposit', [], { tokenId: tokenIdA, amount: '1' })
      await _call('deposit', [], { tokenId: tokenIdB, amount: '2' })
      await mine(provider)
      await mine(provider)


      await mine(provider)
      await mine(provider)
      const interimPoolA = await contract.callOffChain('getHoldingPoolBalance', [firstAccount.address, tokenIdA])
      expect(interimPoolA).to.not.be.null
      expect(interimPoolA![0]).equal('1')

      const interimPoolB = await contract.callOffChain('getHoldingPoolBalance', [firstAccount.address, tokenIdB])
      expect(interimPoolB).to.not.be.null
      expect(interimPoolB![0]).equal('2')

      await awaitReceiveAll(provider, firstAccount.address, firstAccount.privateKey)
      const interimBalanceA = await accountBalance(provider, firstAccount.address, tokenIdA)
      const interimBalanceB = await accountBalance(provider, firstAccount.address, tokenIdB)
      expect(initialBalanceA.sub(interimBalanceA)).to.equal(BigNumber.from('1'))
      expect(initialBalanceB.sub(interimBalanceB)).to.equal(BigNumber.from('2'))

      await _call('withdraw', [ '1', tokenIdA ], {})
      await _call('withdraw', [ '2', tokenIdB ], {})
      await mine(provider)
      await mine(provider)

      await awaitReceiveAll(provider, firstAccount.address, firstAccount.privateKey)
      const finalBalanceA = await accountBalance(provider, firstAccount.address, tokenIdA)
      const finalBalanceB = await accountBalance(provider, firstAccount.address, tokenIdB)
      expect(finalBalanceA).to.equal(initialBalanceA)
      expect(finalBalanceB).to.equal(initialBalanceB)
    }).timeout(60000)

    it('open a liquidity pool', async () => {
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

      await _call('deposit', [], { tokenId: tokenIdA, amount: '1' })
      await _call('deposit', [], { tokenId: tokenIdB, amount: '2' })
      await mine(provider)
      await mine(provider)

      await _call(
        'addLiquidity',
        [
          tokenIdA,
          '1',
          tokenIdB,
          '2',
          '3924849'
        ],
        {}
      )
      
      await mine(provider)
      await mine(provider)
      const balanceA = await contract.callOffChain('getHoldingPoolBalance', [firstAccount.address, tokenIdA])
      expect(balanceA).to.not.be.null
      expect(balanceA![0]).equal('0')

      const balanceB = await contract.callOffChain('getHoldingPoolBalance', [firstAccount.address, tokenIdB])
      expect(balanceB).to.not.be.null
      expect(balanceB![0]).equal('0')

      const pairSupply = await contract.callOffChain('getPairSupply', [tokenIdA, tokenIdB])
      expect(pairSupply).to.not.be.null
      expect(pairSupply![0]).to.equal('1')
      expect(pairSupply![1]).to.equal('2')
    }).timeout(60000)

    it('remove liquidity from pool', async () => {
      const { contract, pairA, pairB } = await _deployContractAndAddPairs()
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

      await _call('deposit', [], { tokenId: tokenIdA, amount: '1' })
      await _call('deposit', [], { tokenId: tokenIdB, amount: '2' })
      await mine(provider)
      await mine(provider)
      await _call(
        'addLiquidity',
        [
          tokenIdA,
          '1',
          tokenIdB,
          '2',
          '3924849'
        ],
        {}
      )
      
      await mine(provider)
      await mine(provider)

      const liquidityProvidedResponse = await contract.callOffChain('getLiquidityPoolBalance', [firstAccount.address, tokenIdA, tokenIdB])
      expect(liquidityProvidedResponse).is.not.null
      const liquidityProvided = liquidityProvidedResponse![0]

      await _call(
        'removeLiquidity',
        [
          liquidityProvided,
          tokenIdA,
          '1',
          tokenIdB,
          '1',
          '394893492'
        ],
        {}
      )

      await awaitReceiveAll(provider, firstAccount.address, firstAccount.privateKey)
      const finalBalanceA = await accountBalance(provider, firstAccount.address, tokenIdA)
      const finalBalanceB = await accountBalance(provider, firstAccount.address, tokenIdB)
      expect(finalBalanceA).to.equal(initialBalanceA)
      expect(finalBalanceB).to.equal(initialBalanceB)
    }).timeout(60000)

    it('add liquidity to existing pool', async () => {
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

      await _call('deposit', [], { tokenId: tokenIdA, amount: '20000' })
      await _call('deposit', [], { tokenId: tokenIdB, amount: '50000' })
      await mine(provider)
      await mine(provider)

      await _call(
        'addLiquidity',
        [
          tokenIdA,
          '10000',
          tokenIdB,
          '20000',
          '3924849'
        ],
        {}
      ) // 1:2 ratio

      await _call(
        'addLiquidity',
        [
          tokenIdA,
          '10000',
          tokenIdB,
          '30000',
          '3924849'
        ],
        {}
      ) // should still be 1:2 ratio
      
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      const balanceA = await contract.callOffChain('getHoldingPoolBalance', [firstAccount.address, tokenIdA])
      expect(balanceA).to.not.be.null
      expect(balanceA![0]).equal('0')
      const balanceB = await contract.callOffChain('getHoldingPoolBalance', [firstAccount.address, tokenIdB])
      expect(balanceB).to.not.be.null
      expect(balanceB![0]).equal('9999')

      const pairSupply = await contract.callOffChain('getPairSupply', [tokenIdA, tokenIdB])
      expect(pairSupply).to.not.be.null
      expect(pairSupply![0]).to.equal('20000')
      expect(pairSupply![1]).to.equal('40001')
    }).timeout(60000)

    it('add liquidity to existing pool, swapping token order', async () => {
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

      await _call('deposit', [], { tokenId: tokenIdA, amount: '20000' })
      await _call('deposit', [], { tokenId: tokenIdB, amount: '50000' })
      await mine(provider)
      await mine(provider)

      await _call(
        'addLiquidity',
        [
          tokenIdA,
          '10000',
          tokenIdB,
          '20000',
          '3924849'
        ],
        {}
      ) // 1:2 ratio

      await _call(
        'addLiquidity',
        [
          tokenIdB,
          '19999',
          tokenIdA,
          '10000',
          '3924849'
        ],
        {}
      ) // should still be ~1:2 ratio
      
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      const balanceA = await contract.callOffChain('getHoldingPoolBalance', [firstAccount.address, tokenIdA])
      expect(balanceA).to.not.be.null
      expect(balanceA![0]).equal('0')
      const balanceB = await contract.callOffChain('getHoldingPoolBalance', [firstAccount.address, tokenIdB])
      expect(balanceB).to.not.be.null
      expect(balanceB![0]).equal('10001')

      const pairSupply = await contract.callOffChain('getPairSupply', [tokenIdA, tokenIdB])
      expect(pairSupply).to.not.be.null
      expect(pairSupply![0]).to.equal('20000')
      expect(pairSupply![1]).to.equal('39999')
    }).timeout(60000)

    it('liquidity pool swaps unbalanced deposit on addLiquiditySwap', async () => {
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

      await _call('deposit', [], { tokenId: tokenIdA, amount: '20000' })
      await _call('deposit', [], { tokenId: tokenIdB, amount: '50000' })
      await mine(provider)
      await mine(provider)

      await _call(
        'addLiquidity',
        [
          tokenIdA,
          '10000',
          tokenIdB,
          '20000',
          '3924849'
        ],
        {}
      ) // 1:2 ratio

      await _call(
        'addLiquiditySwap',
        [
          tokenIdA,
          '10000',
          tokenIdB,
          '30000',
          '3924849'
        ],
        {}
      )
      
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      await mine(provider)
      const balanceA = await contract.callOffChain('getHoldingPoolBalance', [firstAccount.address, tokenIdA])
      expect(balanceA).to.not.be.null
      expect(balanceA![0]).equal('0')
      const balanceB = await contract.callOffChain('getHoldingPoolBalance', [firstAccount.address, tokenIdB])
      expect(balanceB).to.not.be.null
      expect(balanceB![0]).equal('0')

      const pairSupply = await contract.callOffChain('getPairSupply', [tokenIdA, tokenIdB])
      expect(pairSupply).to.not.be.null
      expect(pairSupply![0]).to.equal('20000')
      expect(pairSupply![1]).to.equal('50000')

      const liquidityBalance = await contract.callOffChain('getLiquidityPoolBalance', [firstAccount.address, tokenIdA, tokenIdB])
      expect(liquidityBalance).to.not.be.null
      expect(liquidityBalance![0]).is.oneOf(['24985', '79850'])
    }).timeout(60000)
  })
})

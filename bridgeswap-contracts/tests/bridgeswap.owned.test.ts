import { describe } from 'mocha'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
chai.use(solidity)

import { ViteAPI } from '@vite/vitejs/distSrc/utils/type'
import { CompileResult } from '../src/solppc'
import accounts, { awaitInitAccount } from '../src/accounts'
import { newProvider } from '../src/provider'
import config from '../src/vitejs.config.json'
import { compile } from '../src/compile'
import { mine } from '../src/node'
import { awaitDeployConfirmed, DeployedContract } from '../src/contract'

describe('bridgeswap tests', () => {
  describe('owned tests', function() {
    this.timeout(20000)
    let provider: ViteAPI
    let compileResult: CompileResult
    const firstAccount = accounts[0]
    const secondAccount = accounts[1]
    
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
  
      return { contract }
    }

    it('deploys with owner', async () => {
      const { contract } = await _deployContract()
      
      const ownerResponse = await contract.callOffChain('owner', [])
      expect(ownerResponse).to.be.not.null
      expect(ownerResponse![0]).equal(firstAccount.address)
    })

    it('owner can change owner', async () => {
      const { contract } = await _deployContract()
      await contract.awaitCall(
        firstAccount.address,
        firstAccount.privateKey,
        'changeOwner',
        [secondAccount.address],
        {}
      )
      await mine(provider)
      await mine(provider)
      const ownerResponse = await contract.callOffChain('owner', [])
      expect(ownerResponse).to.be.not.null
      expect(ownerResponse![0]).equal(secondAccount.address)
    })

    it('non-owner cannot change owner', async () => {
      const { contract } = await _deployContract()
      
      await contract.awaitCall(
        secondAccount.address,
        secondAccount.privateKey,
        'changeOwner',
        [secondAccount.address],
        {}
      )
      await mine(provider)
      await mine(provider)
      const ownerResponse = await contract.callOffChain('owner', [])
      expect(ownerResponse).to.be.not.null
      expect(ownerResponse![0]).equal(firstAccount.address)
    })
  })
})
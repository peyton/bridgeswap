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
import { awaitDeployConfirmed, DeployedContract } from '../src/contract'
import { awaitIssueTokenConfirmed, TokenInfo, listTokensOwnedByAddress } from '../src/token'

describe('bridgeswap tests', () => {
  describe('pair tests', function() {
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

    it('owner can create pair', async () => {
      const { contract } = await _deployContract()
      await contract.awaitCall(
        firstAccount.address,
        firstAccount.privateKey,
        'addPair',
        [tokenIdA, tokenIdB],
        {}
      )

      await mine(provider)
      await mine(provider)
      const pairCountResponse = await contract.callOffChain('getPairCount', [])
      expect(pairCountResponse).to.be.not.null
      expect(pairCountResponse![0]).equal('1')

      await mine(provider)
      await mine(provider)
      const pairResponse = await contract.callOffChain('getPairAtIndex', ['0'])
      expect(pairResponse).to.be.not.null
      const tokenIds = new Set([pairResponse![0], pairResponse![1]])
      expect(tokenIds).to.include(tokenIdA)
      expect(tokenIds).to.include(tokenIdB)
    })

    it('owner can create 2 pairs', async () => {
      const { contract } = await _deployContract()
      await contract.awaitCall(
        firstAccount.address,
        firstAccount.privateKey,
        'addPair',
        [tokenIdA, tokenIdB],
        {}
      )
      await contract.awaitCall(
        firstAccount.address,
        firstAccount.privateKey,
        'addPair',
        [tokenIdA, tokenIdC],
        {}
      )

      await mine(provider)
      await mine(provider)
      const pairCountResponse = await contract.callOffChain('getPairCount', [])
      expect(pairCountResponse).to.be.not.null
      expect(pairCountResponse![0]).equal('2')

      await mine(provider)
      await mine(provider)
      const pairResponse0 = await contract.callOffChain('getPairAtIndex', ['0'])
      expect(pairResponse0).to.be.not.null
      const tokenIds0 = new Set([pairResponse0![0], pairResponse0![1]])
      expect(tokenIds0).to.include(tokenIdA)
      expect(tokenIds0).to.include(tokenIdB)

      await mine(provider)
      await mine(provider)
      const pairResponse1 = await contract.callOffChain('getPairAtIndex', ['1'])
      expect(pairResponse1).to.be.not.null
      const tokenIds1 = new Set([pairResponse1![0], pairResponse1![1]])
      expect(tokenIds1).to.include(tokenIdA)
      expect(tokenIds1).to.include(tokenIdC)
    })

    it('cannot create self pair', async () => {
      const { contract } = await _deployContract()
      await contract.awaitCall(
        firstAccount.address,
        firstAccount.privateKey,
        'addPair',
        [tokenIdA, tokenIdA],
        {}
      )

      await mine(provider)
      await mine(provider)
      const pairCountResponse = await contract.callOffChain('getPairCount', [])
      expect(pairCountResponse).to.be.not.null
      expect(pairCountResponse![0]).equal('0')
    })

    it('cannot create duplicate pair', async () => {
      const { contract } = await _deployContract()
      await contract.awaitCall(
        firstAccount.address,
        firstAccount.privateKey,
        'addPair',
        [tokenIdA, tokenIdB],
        {}
      )

      await contract.awaitCall(
        firstAccount.address,
        firstAccount.privateKey,
        'addPair',
        [tokenIdB, tokenIdA],
        {}
      )

      await mine(provider)
      await mine(provider)
      const pairCountResponse = await contract.callOffChain('getPairCount', [])
      expect(pairCountResponse).to.be.not.null
      expect(pairCountResponse![0]).equal('1')

      await mine(provider)
      await mine(provider)
      const pairResponse = await contract.callOffChain('getPairAtIndex', ['0'])
      expect(pairResponse).to.be.not.null
      const tokenIds = new Set([pairResponse![0], pairResponse![1]])
      expect(tokenIds).to.include(tokenIdA)
      expect(tokenIds).to.include(tokenIdB)
    })

    it('nonowner cannot create pair')
  })

})

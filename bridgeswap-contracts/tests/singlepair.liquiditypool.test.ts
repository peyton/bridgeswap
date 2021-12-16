import { ViteAPI } from '@vite/vitejs/distSrc/utils/type'
import { describe } from "mocha";
import { assert, expect } from "chai";
import {
  DeployedContract,
  awaitDeployConfirmed,
  autoReceive
} from "../src/contract";
import { mine } from "../src/node";
import accounts from "../src/accounts";
import config from '../src/vitejs.config.json'
import { compile } from "../src/compile";
import { newProvider } from '../src/provider';
import { 
  type TokenInfo,
  awaitIssueTokenConfirmed,
  listTokensOwnedByAddress 
} from '../src/token'

describe('single pair test', () => {
  describe('liquidity pool test', () => {
    let provider: ViteAPI
  
    before('create provider', () => {
      provider = newProvider(config.networks.local.url)
    })
    
    it("open a liquidity pool", async () => {
      const mineResult = mine(provider)
      const result = await compile("singlepair.solpp")
      await mineResult
  
      expect(result.abis).to.be.not.empty
  
      const account = accounts[0]
  
      autoReceive(provider, account.address, account.privateKey); // If this is not started, tokens will not actually be received - MUST run
      await awaitIssueTokenConfirmed(provider, account.address, account.privateKey, "TOKENONE", "TO");
      await awaitIssueTokenConfirmed(provider, account.address, account.privateKey, "TOKENTWO", "TT");
  
      await mine(provider)
      await mine(provider)
      const tokenlist: [TokenInfo] = await listTokensOwnedByAddress(provider, account.address)
      // expect(tokenlist).to.deep.include({tokenSymbol: "TT"})
      // expect(tokenlist).to.deep.include({tokenSymbol: "TO"})
  
      let tokenIdA;
      let tokenIdB;
      for (let { tokenId, tokenSymbol } of tokenlist.reverse()) {
        if (tokenSymbol === "TT") {
          tokenIdB = tokenId;
        }
        if (tokenSymbol === "TO") {
          tokenIdA = tokenId;
        }
      }
      const balanceInfo = await provider.getBalanceInfo(account.address)
  
      const { send, receive } = await awaitDeployConfirmed(
        provider,
        account.address,
        account.privateKey,
        result.abis[0],
        result.byteCodes[0],
        {
          responseLatency: 1
        }
      )
  
      await mine(provider)
  
      expect(send).is.not.null
      expect(receive).is.not.null
  
      const contract = new DeployedContract(
        provider,
        receive.address,
        result.abis[0],
        result.offChainCodes[0]
      )
  
      await contract.awaitCall(account.address, account.privateKey, 'initialize', [tokenIdA, tokenIdB], {})
      await mine(provider)
      await mine(provider)
      const tokenAResult = await contract.callOffChain('supportedTokens', [])
      expect(tokenAResult).to.not.be.null
      expect(tokenAResult!.length).equal(2)
      expect(tokenAResult![0]).equal(tokenIdA)
  
      await contract.awaitCall(account.address, account.privateKey, 'deposit', [], { tokenId: tokenIdA, amount: '1' });
      await contract.awaitCall(account.address, account.privateKey, 'deposit', [], { tokenId: tokenIdB, amount: '1' });
      await mine(provider)
      await mine(provider)
      await contract.awaitCall(account.address, account.privateKey, 'addLiquidity', ['1', '1', '3920392308'], {});
      await mine(provider)
      await mine(provider)
      let banksupply = await contract.callOffChain('getBalanceAddressToken', [account.address, tokenIdA]);
      expect(banksupply).to.not.be.null
      expect(banksupply![0]).equal('0');
      let pairsupply = await contract.callOffChain('getPairSupply', []);
      expect(pairsupply).to.not.be.null
      expect(pairsupply![0]).equal('1');
      expect(pairsupply![1]).equal('1');
  
      await contract.awaitCall(account.address, account.privateKey, 'removeLiquidity', ['1', '1', '1', '3920392308'], {});
      await mine(provider)
      await mine(provider)
  
      pairsupply = await contract.callOffChain('getPairSupply', []);
      expect(pairsupply).to.not.be.null
      expect(pairsupply![0]).equal('0');
      expect(pairsupply![1]).equal('0');
  
    }).timeout(40000)
  
    it('liquidity pool swaps unbalanced deposit on addLiquidity')
  })
})


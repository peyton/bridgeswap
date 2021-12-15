import { describe } from "mocha";
import { expect } from "chai";
import {
  DeployedContract,
  awaitDeployConfirmed,
  issueToken,
  autoReceive
} from "../src/contract";
import { awaitReceived, mine } from "../src/node";
import accounts from "../src/accounts";
import config from '../src/vitejs.config.json'
import { compile } from "../src/compile";
import { newProvider } from "../src/provider";

const provider = newProvider(config.networks.local.url)

interface TokenInfo {
  tokenSymbol: string,
  tokenId: string
}

describe("single pair test", () => {
  it("open a liquidity pool", async () => {
    const mineResult = mine(provider)
    const result = await compile("singlepair.solpp")
    await mineResult

    expect(result.abis.length > 0)

    const account = accounts[0]

    autoReceive(provider, account.address, account.privateKey); // If this is not started, tokens will not actually be received - MUST run
    const t1result = await issueToken(provider, account.address, account.privateKey, "TOKENONE", "TO");
    const t2result = await issueToken(provider, account.address, account.privateKey, "TOKENTWO", "TT");

    await mine(provider)
    await mine(provider)
    const tokenlist: [TokenInfo] = await provider.request('contract_getTokenInfoListByOwner', account.address)
    let tokenIdA;
    let tokenIdB;

    console.log(tokenlist)
    for (let tltoken of tokenlist) {
      let symbol = tltoken.tokenSymbol;
      if (symbol === "TT") {
        tokenIdB = tltoken.tokenId;
      }
      if (symbol === "TO") {
        tokenIdA = tltoken.tokenId;
      }
    }
    console.log(tokenIdA, tokenIdB);
    const balanceInfo = await provider.getBalanceInfo(account.address);
    console.log(balanceInfo);

    const { send, receive } = await awaitDeployConfirmed(
      provider,
      account.address,
      account.privateKey,
      result.abis[0],
      result.byteCodes[0],
      {}
    );

    expect(send).is.not.null
    expect(receive).is.not.null

    const contract = new DeployedContract(
      provider,
      receive.address,
      result.abis[0],
      result.offChainCodes[0]
    );

    await contract.awaitCall(account.address, account.privateKey, 'initialize', [tokenIdA, tokenIdB], {})

    await mine(provider)
    await mine(provider)
    const tokenAResult = await contract.callOffChain('supportedTokens', [])
    expect(tokenAResult).to.not.be.null
    expect(tokenAResult!.length).equal(2)
    expect(tokenAResult![0]).equal(tokenIdA)

    await contract.awaitCall(account.address, account.privateKey, 'deposit', [], { tokenId: tokenIdA, amount: '1' });
    const depresponse = await contract.awaitCall(account.address, account.privateKey, 'deposit', [], { tokenId: tokenIdB, amount: '1' });
    await mine(provider)
    await mine(provider)
    console.log(depresponse)
    const response = await contract.awaitCall(account.address, account.privateKey, 'addLiquidity', [1, 1], {});
    await mine(provider)
    await mine(provider)
    console.log(response)
    let banksupply = await contract.callOffChain('getBalanceAddressToken', [account.address, tokenIdA]);
    expect(banksupply).to.not.be.null
    expect(banksupply![0]).equal('0');
    let pairsupply = await contract.callOffChain('getPairSupply', []);
    expect(pairsupply).to.not.be.null
    expect(pairsupply![0]).equal('1');
    expect(pairsupply![1]).equal('1');

    await contract.awaitCall(account.address, account.privateKey, 'removeLiquidity', [1, 1], {});
    await mine(provider)
    await mine(provider)

    pairsupply = await contract.callOffChain('getPairSupply', []);
    expect(pairsupply).to.not.be.null
    expect(pairsupply![0]).equal('0');
    expect(pairsupply![1]).equal('0');

  }).timeout(20000)
})

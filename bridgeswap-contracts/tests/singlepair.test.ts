import { describe } from "mocha";
import { expect } from "chai";
import {
  DeployedContract,
  awaitDeployConfirmed,
} from "../src/contract";
import { awaitReceived, mine } from "../src/node";
import accounts from "../src/accounts";
import config from '../src/vitejs.config.json'
import { compile } from "../src/compile";
import { newProvider } from "../src/provider";

const provider = newProvider(config.networks.local.url)

describe("single pair test", () => {
  it("initialize sets token ids", async () => {
    const mineResult = mine(provider)
    const result = await compile("singlepair.solpp")
    await mineResult

    expect(result.abis.length > 0)

    const account = accounts[0]
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

    await contract.awaitCall(account.address, account.privateKey, 'initialize',  ["tti_5649544520544f4b454e6e40", "tti_322862b3f8edae3b02b110b1"], {})

    await mine(provider)
    await mine(provider)
    const tokenAResult = await contract.callOffChain('supportedTokens', [])
    expect(tokenAResult).to.not.be.null
    expect(tokenAResult!.length).equal(2)
    expect(tokenAResult![0]).equal("tti_5649544520544f4b454e6e40")
  }).timeout(20000)
})
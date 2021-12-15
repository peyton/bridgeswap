import { describe } from "mocha";
import { assert, expect } from "chai";
import {
  DeployedContract,
  awaitDeployConfirmed,
  issueToken,
  autoReceive
} from "../src/contract";
import { mine } from "../src/node";
import accounts from "../src/accounts";
import config from '../src/vitejs.config.json'
import { compile } from "../src/compile";
import { newProvider } from "../src/provider";

const provider = newProvider(config.networks.local.url)

interface TokenInfo {
  tokenSymbol: string,
  tokenId: string
}

describe("swap test", () => {
  it("basic swap input", async () => {
    assert.fail()
  }).timeout(40000)

  it("basic swap output", async () => {
    assert.fail()
  }).timeout(40000)
})

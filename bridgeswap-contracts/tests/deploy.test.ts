// adapted from bridge-vite

import { describe } from "mocha"
import { expect } from "chai"

import config from '../src/vitejs.config.json'
import { deploy as deployContract, awaitDeploy } from "../src/contract"
import { awaitReceived, awaitConfirmed, mine } from "../src/node"
import accounts from "../src/accounts"
import { newProvider } from '../src/provider'
import { compile } from "../src/compile"

const provider = newProvider(config.networks.local.url)

describe("deploy test", () => {
  // the tests container
  it("checking deploy result", async () => {
    const mineResult = mine(provider);
    const result = await compile("Hello.solpp");
    await mineResult;

    console.log(result.byteCodes[0]);
    const deployResult = await deployContract(
      accounts[0].address,
      result.abis[0],
      result.byteCodes[0],
      { params: ["tti_5649544520544f4b454e6e40"] }
    );
    console.log("------", deployResult);
    const receivedBlock = await awaitReceived(deployResult.hash);
    console.log("+++++++", receivedBlock);
    await mine(provider);
    const confirmedBlock = await awaitConfirmed(receivedBlock.receiveBlockHash);
    console.log("*******", confirmedBlock);
  }).timeout(10000);

  it("checking await deploy result", async () => {
    const mintResult = mint();
    const result = await compile("Hello.solpp");
    await mintResult;

    console.log(result.byteCodeArr[0]);
    const { send, receive } = await awaitDeploy(
      accounts[0].address,
      result.abiArr[0],
      result.byteCodeArr[0],
      { params: ["tti_5649544520544f4b454e6e40"] }
    );
    console.log("------", send, receive);
  }).timeout(10000);
});

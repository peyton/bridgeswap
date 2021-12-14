// adapted from bridge-vite

import { describe } from "mocha";
import { expect } from "chai";
import {
  deploy as deployContract,
  awaitDeploy,
  DeployedContract,
} from "../src/contract";
import { awaitReceived, mint } from "../src/node";
import accounts from "../src/accounts";
import { compile } from "../src/compile";

describe("call test", () => {
  // the tests container
  it("checking await call result", async () => {
    const mintResult = mint();
    const result = await compile("Hello.solpp");
    await mintResult;

    const { send, receive } = await awaitDeploy(
      accounts[0].address,
      result.abis[0],
      result.byteCodes[0],
      { params: ["tti_5649544520544f4b454e6e40"] }
    );
    console.log("------", send, receive);

    const cc = new DeployedContract(
      receive.address,
      result.abis[0],
      result.offChainCodes[0]
    );

    await cc
      .call(accounts[0].address, "hello", [accounts[0].address], {})
      .then(async (block) => {
        await awaitReceived(block.hash);
        console.log("await reco");
      });
    const lastToResult = await cc.offChain("lastTo", []);
    console.log(lastToResult);
    console.log(result.offChainCodes[0]);
    console.log(JSON.stringify(result.abis[0]));

    expect(lastToResult).to.not.be.null;
    expect(lastToResult!.length).equal(1);
    expect(lastToResult![0]).equal(accounts[0].address);
  }).timeout(10000);
});

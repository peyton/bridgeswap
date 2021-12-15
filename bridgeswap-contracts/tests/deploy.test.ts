// adapted from bridge-vite

import { ViteAPI } from '@vite/vitejs/distSrc/utils/type'
import { describe } from 'mocha'
import { expect } from 'chai'

import config from '../src/vitejs.config.json'
import { 
  awaitDeploy,
  awaitDeployConfirmed,
  deploy as deployContract, 
} from '../src/contract'
import { awaitReceived, awaitConfirmed, mine } from '../src/node'
import accounts from '../src/accounts'
import { newProvider } from '../src/provider'
import { compile } from '../src/compile'


describe('deploy test', () => {
  let provider: ViteAPI

  before('create provider', () => {
    provider = newProvider(config.networks.local.url)
  })

  it('deploy succeeds', async () => {
    const mineResult = mine(provider)
    const compileResult = await compile('Hello.solpp')
    await mineResult
    expect(compileResult).is.not.null

    const account = accounts[0]
    const deployResult = await deployContract(
      provider,
      account.address,
      account.privateKey,
      compileResult.abis[0],
      compileResult.byteCodes[0],
      { params: ['tti_5649544520544f4b454e6e40'] }
    );
    const receivedBlock = await awaitReceived(provider, deployResult.hash!)
    expect(receivedBlock).is.not.null
    await mine(provider);
    const confirmedBlock = await awaitConfirmed(provider, receivedBlock.receiveBlockHash!)
    expect(confirmedBlock).is.not.null
  }).timeout(20000)

  it('await deploy succeeds', async () => {
    const mineResult = mine(provider);
    const compileResult = await compile('Hello.solpp');
    await mineResult;

    const account = accounts[0]
    const { send: sendBlock } = await awaitDeploy(
      provider,
      account.address,
      account.privateKey,
      compileResult.abis[0],
      compileResult.byteCodes[0],
      { params: ['tti_5649544520544f4b454e6e40'] }
    );
    expect(sendBlock).is.not.null
  }).timeout(20000)

  it('await and confirm deploy succeeds', async () => {
    const mineResult = mine(provider)
    const compileResult = await compile('Hello.solpp')
    await mineResult;

    const account = accounts[0]
    const { send: sendBlock, receive: receiveBlock } = await awaitDeployConfirmed(
      provider,
      account.address,
      account.privateKey,
      compileResult.abis[0],
      compileResult.byteCodes[0],
      { params: ['tti_5649544520544f4b454e6e40'] }
    );

    expect(sendBlock).is.not.null
    expect(receiveBlock).is.not.null
  }).timeout(20000)
})

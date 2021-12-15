// adapted from bridge-vite

import { accountBlock, constant as viteConstant } from "@vite/vitejs";
import { ViteAPI, ProviderType } from "@vite/vitejs/distSrc/utils/type";

import { signAndSend } from './provider'
import {
  awaitConfirmed,
  awaitReceived,
  mine,
  accountHeight,
} from './node'

const { Contracts, Vite_TokenId } = viteConstant
const { ReceiveAccountBlockTask } = accountBlock;

interface DeployProps {
  responseLatency?: Number
  quotaMultiplier?: Number
  randomDegree?: Number
  params?: string | Array<string | boolean | Object>
}

async function _deploy(
  provider: ProviderType,
  address: string,
  key: string,
  abi: Object | Array<Object>,
  code: string,
  {
    responseLatency = 0,
    quotaMultiplier = 10,
    randomDegree = 0,
    params
  }: DeployProps
) {
  const block = accountBlock.createAccountBlock('createContract', {
    abi: abi,
    code: code,
    quotaMultiplier: quotaMultiplier,
    randomDegree: randomDegree,
    responseLatency: responseLatency,
    params: params,
    address: address
  })
  return signAndSend(provider, block, key)
}

async function _stakeQuota(
  provider: ProviderType,
  address: string,
  key: string,
  beneficiaryAddress: string,
  amount = '5134000000000000000000'
) {
  const block = accountBlock.createAccountBlock('stakeForQuota', {
    address: address,
    beneficiaryAddress: beneficiaryAddress,
    amount: amount
  })
  return signAndSend(provider, block, key)
}

async function _autoReceive(
  provider: ProviderType,
  address: string,
  key: string
) {
  const ReceiveTask = new ReceiveAccountBlockTask({
    address: address,
    privateKey: key,
    provider: provider
  });
  ReceiveTask.start({
    checkTime: 1000,
    transctionNumber: 10 // Yes, this is actually mispelled on Vite's end
  });
}

async function _awaitDeploy(
  provider: ProviderType,
  address: string,
  key: string,
  abi: Object | Array<Object>,
  code: string,
  {
    responseLatency = 0,
    quotaMultiplier = 10,
    randomDegree = 0,
    params
  }: DeployProps
) {
  const deployResult = await deploy(provider, address, key, abi, code, {
    responseLatency,
    quotaMultiplier,
    randomDegree,
    params,
  })
  const receivedBlock = await awaitReceived(provider, deployResult.hash!)
  return { send: receivedBlock }
}

async function _awaitDeployConfirmed(
  provider: ProviderType,
  address: string,
  key: string,
  abi: Object | Array<Object>,
  code: string,
  {
    responseLatency = 0,
    quotaMultiplier = 10,
    randomDegree = 0,
    params
  }: DeployProps
) {
  const deployResult = await deploy(provider, address, key, abi, code, {
    responseLatency,
    quotaMultiplier,
    randomDegree,
    params,
  })
  const stakeBlock = await _stakeQuota(provider, address, key, deployResult.toAddress!)
  await mine(provider)
  await awaitReceived(provider, stakeBlock.hash!)

  const receivedBlock = await awaitReceived(provider, deployResult.hash!)
  await mine(provider)
  const confirmedBlock = await awaitConfirmed(provider, receivedBlock.receiveBlockHash!)
  return { send: receivedBlock, receive: confirmedBlock }
}

interface CallProps {
  tokenId?: string
  amount?: string // bignum?
}

class DeployedContract {
  _address: string
  _abi: Array<{ name: string; type: string }>
  _offChainCode?: any
  _provider: ViteAPI

  constructor(
    provider: ViteAPI,
    address: string,
    abi: Array<{ name: string; type: string }>,
    code?: any
  ) {
    this._provider = provider
    this._abi = abi
    this._address = address
    this._offChainCode = Buffer.from(code, 'hex').toString('base64')
  }

  async awaitCall(
    sender: string,
    senderKey: string,
    methodName: string,
    params: any[],
    {
      tokenId = Vite_TokenId,
      amount = '0'
    }: CallProps
  ) {
    const block = await this.call(sender, senderKey, methodName, params, {
      tokenId,
      amount
    })
    const receivedBlock = await awaitReceived(this._provider, block.hash!)
    await mine(this._provider)
    const confirmedBlock = await awaitConfirmed(this._provider, receivedBlock.receiveBlockHash!)
    return { send: receivedBlock, receive: confirmedBlock }
  }

  async call(
    sender: string,
    senderKey: string,
    methodName: string,
    params: any[],
    {
      tokenId = Vite_TokenId,
      amount = '0'
    }: CallProps
  ) {
    const methodAbi = this._abi.find((x) => {
      return x.name === methodName && x.type === 'function'
    })
    if (!methodAbi) {
      throw new Error(`method not found: ${methodName}`)
    }

    const block = accountBlock.createAccountBlock('callContract', {
      address: sender,
      abi: methodAbi,
      toAddress: this._address,
      params: params,
      tokenId: tokenId,
      amount: amount
    })
    return signAndSend(this._provider, block, senderKey)
  }

  async callOffChain(methodName: string, params: any[]) {
    const methodAbi = this._abi.find((x) => {
      return x.type === 'offchain' && x.name === methodName
    })
    if (!methodAbi) {
      throw new Error(`method not found: ${methodName}`)
    }
    return this._provider.callOffChainContract({
      address: this._address,
      abi: methodAbi,
      code: this._offChainCode,
      params: params
    })
  }
}

export { type CallProps, type DeployProps }
export { DeployedContract }
export const awaitDeploy = _awaitDeploy
export const awaitDeployConfirmed = _awaitDeployConfirmed
export const autoReceive = _autoReceive
export const deploy = _deploy

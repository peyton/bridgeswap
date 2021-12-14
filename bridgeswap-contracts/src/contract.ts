// adapted from bridge-vite

import { accountBlock, constant } from "@vite/vitejs";
import { ProviderType } from "@vite/vitejs/distSrc/utils/type";

import { signAndSend } from './provider'
import {
  awaitConfirmed,
  awaitReceived,
  mine,
  accountHeight,
} from './node'

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

export { type DeployProps }
export const awaitDeploy = _awaitDeploy
export const awaitDeployConfirmed = _awaitDeployConfirmed
export const deploy = _deploy

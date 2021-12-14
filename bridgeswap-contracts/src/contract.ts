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
  }: {
    responseLatency?: Number
    quotaMultiplier?: Number
    randomDegree?: Number
    params?: string | Array<string | boolean | Object>
  }
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
}

export const deploy = _deploy

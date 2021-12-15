// adapted from bridge-vite

import { ViteAPI } from '@vite/vitejs'
import { AccountBlockClassType, ProviderType } from '@vite/vitejs/distSrc/utils/type'
const { HTTP_RPC } = require('@vite/vitejs-http')

function _newProvider(url: string) {
  return new ViteAPI(new HTTP_RPC(url), () => {})
}

async function _signAndSend(
  provider: ProviderType,
  block: AccountBlockClassType,
  privateKey: string
) {
  block.setProvider(provider).setPrivateKey(privateKey)
  await block.autoSetPreviousAccountBlock()
  return await block.sign().send()
}

export const newProvider = _newProvider
export const signAndSend = _signAndSend

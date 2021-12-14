// adapted from bridge-vite

import { ViteAPI } from '@vite/vitejs'
import { AccountBlockClassType, ProviderType } from '@vite/vitejs/distSrc/utils/type'
const { HTTP_RPC } = require('@vite/vitejs-http')

function _newProvider(url: string) {
  return new ViteAPI(new HTTP_RPC(url), () => {
    console.log('Provider connected')
  })
}

async function _signAndSend(
  provider: ProviderType,
  block: AccountBlockClassType,
  privateKey: string
) {
  block.setProvider(provider).setPrivateKey(privateKey)
  await block.autoSetPreviousAccountBlock()
  const result = await block.sign().send()
  console.log('send success', result)
  return result
}

export const newProvider = _newProvider
export const signAndSend = _signAndSend

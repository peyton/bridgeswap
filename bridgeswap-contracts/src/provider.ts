// adapted from bridge-vite

import { ViteAPI } from '@vite/vitejs'
const { HTTP_RPC } = require('@vite/vitejs-http')

function _newProvider(url: string) {
  return new ViteAPI(new HTTP_RPC(url), () => {
    console.log('Provider connected')
  })
}

async function _signAndSend(
  provider: any,
  block: any,
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

// TODO

// adapted from bridge-vite

import { ProviderType } from "@vite/vitejs/distSrc/utils/type"

async function _mine(provider: ProviderType) {
  await sleep(1000)
  return provider.request("miner_mine");
}

export const mine = _mine


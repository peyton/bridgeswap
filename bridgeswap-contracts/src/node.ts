// TODO

// adapted from bridge-vite

import Provider from "@vite/vitejs/distSrc/viteAPI/provider";

export async function mint(provider: any) {
  await sleep(1000);
  return provider.request("miner_mine");
}
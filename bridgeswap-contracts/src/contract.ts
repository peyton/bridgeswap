// adapted from bridge-vite

import { accountBlock, constant } from "@vite/vitejs";

async function deploy(
  provider: string,
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
    
  })
}

function awaitDeploy

// adapted from bridge-vite

import config from './vitejs.config.json'

interface Network {
  url: string
  mnemonic: string
}

interface Compiler {
  version: string
  build: string
  name: string
  sourceDir?: string
}

interface Node {
  name: string
  version: string
  build: string
}

function _compilerConfig(): Compiler {
  let result: Compiler = config.compilers.solppc
  if (!result.sourceDir) {
    result.sourceDir = process.env.VITE_CONTRACTS_ROOT
  }
  if (!result.sourceDir) {
    console.error('No contract source directory')
    process.exit(1)
  }
  return result
}

export const network: Network = config.networks.local
export const compiler: Compiler = _compilerConfig()
export const node: Node = config.nodes.virtual

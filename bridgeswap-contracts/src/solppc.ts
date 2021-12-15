// adapted from bridge-vite

import { compiler } from './config'
import { dockerRun } from './docker'
import os from 'os'

function _getDockerImageString() {
  if (compiler.build === 'release') {
    return `vitelabs/${compiler.name}:${compiler.version}`
  }
  return `vitelabs/${compiler.name}-${compiler.build}:${compiler.version}-latest`
}

interface CompileResult {
  contractNames: any[]
  abis: any[]
  byteCodes: any[]
  offChainCodes: any[]
}

async function _compile(filename: string): Promise<CompileResult> {
  const baseDir = compiler.sourceDir
  console.log(`docker run --rm -v ${baseDir}:/root/tmp/contracts ${_getDockerImageString()} --bin --abi /root/tmp/contracts/${filename}`)
  const output = await dockerRun(
    _getDockerImageString(),
    ["--bin", "--abi", `/root/tmp/contracts/${filename}`],
    {
      HostConfig: {
        AutoRemove: true,
        Binds: [`${baseDir}:/root/tmp/contracts`],
      },
    }
  );
  return _parseCompileOutput(output);
}

function _parseCompileOutput(output: string): CompileResult {
  let result: CompileResult = {
    contractNames: [],
    abis: [],
    byteCodes: [],
    offChainCodes: []
  }
  let lines = output.split(os.EOL);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (line.startsWith("======= ")) {
      line = line.slice("======= ".length, -" =======".length).split(":")[1]
      result.contractNames.push(line.trim())
    } else if (line.startsWith("Binary:")) {
      i++;
      result.byteCodes.push(lines[i].trim())
    } else if (line.startsWith("OffChain Binary:")) {
      i++;
      result.offChainCodes.push(lines[i].trim())
    } else if (line.startsWith("Contract JSON ABI")) {
      i++;
      result.abis.push(JSON.parse(lines[i]))
    }
  }

  return result
}

async function _version(): Promise<string> {
  const output = await dockerRun(_getDockerImageString(), ['--version'], {
    HostConfig: {
      AutoRemove: true
    }
  })
  return _parseVersionOutput(output)
}

function _parseVersionOutput(output: string): string {
  let lines = output.split(os.EOL)
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (line.startsWith("Version:")) {
      line = line.split(":")[1]
      return line.trim()
    }
  }
  return "Unknown version"
}

export const compile = _compile
export const version = _version

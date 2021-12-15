// TODO

// adapted from bridge-vite

import { AccountBlockClassType, AccountBlockType, ProviderType } from "@vite/vitejs/distSrc/utils/type"

import { sleep } from './utils'

async function _mine(provider: ProviderType) {
  await sleep(1000)
  return provider.request("miner_mine");
}

function _height(provider: ProviderType) {
  return provider.request('ledger_getSnapchotChainHeight')
}

async function _accountBlockByHash(provider: ProviderType, hash: string) {
  return provider.request('ledger_getAccountBlockByHash', hash)
}

function _accountHeight(provider: ProviderType, address: string) {
  return provider
    .request('ledger_getLatestAccountBlock', address)
    .then((block?: AccountBlockClassType) => {
      return block?.height ?? 0
    })
}

function _accountQuota(provider: ProviderType, address: string) {
  return provider.request('contract_getQuotaByAccount', address)
}

async function _isConfirmed(provider: ProviderType, hash: string) {
  return _accountBlockByHash(provider, hash)
    .then((block: AccountBlockType) => {
      if (!block?.confirmations) {
        return false
      }
      return true
    })
}

async function _isReceived(provider: ProviderType, hash: string) {
  return _accountBlockByHash(provider, hash)
    .then((block: AccountBlockType) => {
      if (!block?.receiveBlockHash) {
        return false
      }
      return true
    })
}

async function _awaitConfirmed(provider: ProviderType, hash: string) {
  while (!(await _isConfirmed(provider, hash))) {
    await _mine(provider)
  }
  return await _accountBlockByHash(provider, hash)
}

async function _awaitReceived(provider: ProviderType, hash: string) {
  while (!(await _isReceived(provider, hash))) {
    await _mine(provider)
  }
  return await _accountBlockByHash(provider, hash)
}

export const accountHeight = _accountHeight
export const accountQuota = _accountQuota
export const awaitConfirmed = _awaitConfirmed
export const awaitReceived = _awaitReceived
export const height = _height
export const isConfirmed = _isConfirmed
export const isReceived = _isReceived
export const mine = _mine

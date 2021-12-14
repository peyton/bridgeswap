import * as config from './accounts.config.json'
import { wallet } from '@vite/vitejs'

const walletInstance = wallet.getWallet(config.mnemonic)

console.log("========")
console.log("Enumerating first 10 accounts.")

const accounts = walletInstance.deriveAddressList(0, 10)
accounts.forEach((account) => console.log(account.address, account.privateKey))
console.log("Done.")

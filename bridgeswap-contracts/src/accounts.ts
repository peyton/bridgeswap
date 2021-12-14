import { network } from './config'
import { wallet } from '@vite/vitejs'

const walletInstance = wallet.getWallet(network.mnemonic)

export default walletInstance.deriveAddressList(0, 10)
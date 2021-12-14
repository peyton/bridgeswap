import accounts from '../src/accounts'

console.log("========")
console.log("Enumerating first 10 accounts.")
accounts.forEach((account) => console.log(account.address, account.privateKey))
console.log("Done.")

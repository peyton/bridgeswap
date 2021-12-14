import { describe } from 'mocha'
import { expect } from 'chai'

import accounts from '../src/accounts'

describe('accounts test', () => {
  it ('first account matches expected', () => {
    expect(accounts).length.greaterThanOrEqual(1)
    const firstAccount = accounts[0]
    expect(firstAccount.address).to.equal('vite_cecce91eb5ed40879105e1c780c572d087bb6ec91db043f422')
    expect(firstAccount.privateKey).to.equal('f6f56f3e2ad846fed95f420909bf538d188503e3de2a98f9ab58dcdb8b4f9265e7575ea5f0d65827acdeb599c047714bdf59a84764bb2dd3a6a995940218894f')
  })

  it ('second account matches expected', () => {
    expect(accounts).length.greaterThanOrEqual(2)
    const secondAccount = accounts[1]
    expect(secondAccount.address).to.equal('vite_0afd645ca4b97441cae39c51e0b29355cbccbf43440457be7b')
    expect(secondAccount.privateKey).to.equal('f5402858187e68010a3680de6ba0479c1009f298d5b5f5acf5ab601ba7d6d04d2076b85a87962e06cef57f977bdac1f14c19f4c6b2ce92ecb72207989f0682e3')
  })
})

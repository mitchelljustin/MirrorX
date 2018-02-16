import {Stellar} from '../stellar.mjs'

import SuperStruct from 'superstruct'
import Decimal from 'decimal.js-light'

const {superstruct} = SuperStruct

function isValidSide(side) {
    return side === 'withdraw' || side === 'deposit'
}

function isValidStellarAccount(stellarAccount) {
    try {
        Stellar.Keypair.fromPublicKey(stellarAccount)
        return true
    } catch (e) {
        return false
    }
}

function isValidStellarAmount(amount) {
    // Is this a valid amount in stroops
    const stroops = Decimal(amount).times(1e7);
    return stroops.decimalPlaces() === 0 && stroops.log(2).lt(64)
}

const struct = superstruct({
    types: {
        depositOrWithdraw: isValidSide,
        stroopAmount: isValidStellarAmount,
        stellarPublicKey: isValidStellarAccount,
    },
})

const WithdrawRequest = struct({
    swapSize: 'stroopAmount',
    holdingAccount: 'stellarPublicKey',
    stellarAccount: 'stellarPublicKey',
    cryptoAddress: 'string',
})

const DepositRequest = struct({
    swapSize: 'stroopAmount',
    stellarAccount: 'stellarPublicKey',
    cryptoAddress: 'string',
})

export {DepositRequest, WithdrawRequest}
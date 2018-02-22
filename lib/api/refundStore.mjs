'use strict'
import {Stellar} from '../stellar.mjs'

const REFUND_TX_EXPIRY = 12 * 60 * 60

export default class RefundStore {
    constructor({redis}) {
        this.redis = redis
    }

    _makeRefundTxKey({hash}) {
        return `refundTx::${hash}`
    }

    async save({xdr}) {
        const tx = new Stellar.Transaction(xdr)
        const hash = tx.hash().toString('hex')
        const key = this._makeRefundTxKey({hash})
        await this.redis.setexAsync(key, REFUND_TX_EXPIRY, xdr)
        return {hash}
    }

    async retrieve({hash}) {
        const key = this._makeRefundTxKey({hash})
        return await this.redis.getAsync(key)
    }
}
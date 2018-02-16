import UUID from 'uuid'

const SWAP_EXPIRY = 12 * 60 * 60

export default class MatchingEngine {
    constructor({currency, redis}) {
        this.currency = currency
        this.redis = redis
    }

    matchForever({swapSize}) {
        const depositQueueKey = this._makeSwapQueueKey({swapSize, side: 'deposit'})
        const withdrawQueueKey = this._makeSwapQueueKey({swapSize, side: 'withdraw'})
        console.log(`Matching forever`)
        console.log(JSON.stringify({depositQueueKey, withdrawQueueKey}, null, 2))
        let nextMatch = () => {
            return this._matchSwap({depositQueueKey, withdrawQueueKey})
                .then(nextMatch)
        }
        nextMatch()
    }

    async _popExtantSwapReqId({queueKey}) {
        let swapReqId = null, _
        while (swapReqId === null) {
            [_, swapReqId] = await this.redis.blpopAsync(queueKey, 0)
            const swapReqExists = await this.redis.existsAsync(swapReqId)
            if (!swapReqExists) {
                console.debug(`Swap request popped from ${queueKey} expired: ${swapReqId}`)
                swapReqId = null
            }
        }
        return swapReqId
    }

    async _matchSwap({depositQueueKey, withdrawQueueKey}) {
        const depositId = await this._popExtantSwapReqId({queueKey: depositQueueKey})
        const withdrawalId = await this._popExtantSwapReqId({queueKey: withdrawQueueKey})
        console.log(`Matching deposit:${depositId} <--> withdrawal:${withdrawalId}`)
        const batch = this.redis.multi()
        batch.set(this._makeMatchedSwapIdKey(depositId), withdrawalId)
        batch.set(this._makeMatchedSwapIdKey(withdrawalId), depositId)
        batch.expire(depositId, SWAP_EXPIRY)
        batch.expire(withdrawalId, SWAP_EXPIRY)
        await batch.execAsync()
    }

    _genSwapReqId() {
        return `swr_${UUID.v4()}`
    }

    _makeSwapQueueKey({swapSize, side}) {
        return `swapQueue::${this.currency}:${swapSize}:${side}`
    }

    _makeMatchedSwapIdKey(swapReqId) {
        return `matchedSwapId::${swapReqId}`
    }

    async addWithdrawReq(swapReq) {
        return await this._pushSwapReq({side: 'withdraw', ...swapReq})
    }

    async addDepositReq(swapReq) {
        return await this._pushSwapReq({side: 'deposit', ...swapReq})
    }

    async _pushSwapReq(swapReq) {
        const {swapSize, side} = swapReq
        const swapReqId = this._genSwapReqId()
        const queueKey = this._makeSwapQueueKey({swapSize, side})
        const batch = this.redis.multi()
        batch.hmset(swapReqId, swapReq)
        batch.expire(swapReqId, SWAP_EXPIRY)
        batch.rpush(queueKey, swapReqId)
        await batch.execAsync()
        return {swapReqId}
    }

    async getSwapInfo({swapReqId}) {
        const reqInfo = await this.redis.hgetallAsync(swapReqId)
        if (reqInfo === null) {
            return {
                status: 'notFound',
            }
        }
        await this.redis.expire(swapReqId, SWAP_EXPIRY)
        const matchedSwapId = await this.redis.getAsync(this._makeMatchedSwapIdKey(swapReqId))
        if (matchedSwapId === null) {
            return {
                status: 'notMatched',
                reqInfo,
            }
        }
        const matchedInfo = await this.redis.hgetallAsync(matchedSwapId)
        if (matchedInfo === null) {
            return {
                status: 'cancelled',
                reqInfo,
            }
        }
        return {
            status: 'matched',
            matchedInfo,
            reqInfo,
        }
    }
}
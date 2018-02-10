import UUID from 'uuid'

const SWAP_EXPIRY = 600

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

    async _matchSwap({depositQueueKey, withdrawQueueKey}) {
        const [_1, depositId] = await this.redis.brpopAsync(depositQueueKey, 0)
        const [_2, withdrawalId] = await this.redis.brpopAsync(withdrawQueueKey, 0)
        console.log(`Matching deposit:${depositId} <--> withdrawal:${withdrawalId}`)
        const batch = this.redis.multi()
        batch.hset(depositId, 'matchedSwapId', withdrawalId)
        batch.hset(withdrawalId, 'matchedSwapId', depositId)
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

    async addSwap({amount: swapSize, side, stellarAccount}) {
        const swapId = this._genSwapReqId()
        // for example swapQueue::ETH:0.1:deposit
        const swapQueueKey = this._makeSwapQueueKey({swapSize, side})
        const batch = this.redis.multi()
        batch.hmset(swapId, {
            requestorAccount: stellarAccount,
            side,
        })
        batch.expire(swapId, SWAP_EXPIRY)
        batch.lpush(swapQueueKey, swapId)
        await batch.execAsync()
        return {swapId}
    }

    async getSwapMatch({swapId}) {
        const swapInfo = await this.redis.hgetallAsync(swapId)
        if (swapInfo === null) {
            return null
        }
        const {requestorAccount, matchedSwapId, side} = swapInfo
        if (matchedSwapId === undefined) {
            return null
        }
        const matchedAccount = await this.redis.hgetAsync(matchedSwapId, 'requestorAccount')
        let depositorAccount, withdrawerAccount
        if (side === 'deposit') {
            depositorAccount = requestorAccount
            withdrawerAccount = matchedAccount
        } else {
            depositorAccount = matchedAccount
            withdrawerAccount = requestorAccount
        }
        return {depositorAccount, withdrawerAccount, side}
    }
}
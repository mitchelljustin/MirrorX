import UUID from 'uuid'

const SWAP_EXPIRY = 600

export default class MatchingEngine {
    constructor({currency, swapSizes, redis}) {
        this.currency = currency
        this.redis = redis
        this.swapSizes = swapSizes
    }

    tick() {
        const start = new Date()
        this._matchSwaps()
            .then(() => {
                const ms = new Date() - start
                console.log(`Matched swaps in ${ms}ms`)
            })
            .catch((e) => {
                console.error(e)
            })
    }

    async _matchSwaps() {
        const promises = this.swapSizes.map(this._matchSwapsWithSize.bind(this))
        await Promise.all(promises)
    }

    async _matchSwapsWithSize(swapSize) {
        const depositQueueKey = this._makeSwapQueueKey({swapSize, side: 'deposit'});
        const withdrawalQueueKey = this._makeSwapQueueKey({swapSize, side: 'withdraw'});
        const getLengths = this.redis.multi()
        getLengths.llenAsync(depositQueueKey)
        getLengths.llenAsync(withdrawalQueueKey)
        const [nDeposits, nWithdrawals] = await getLengths.execAsync()
        const nSwaps = Math.min(nDeposits, nWithdrawals)
        if (nSwaps === 0) {
            console.log(`Nothing to swap for ${swapSize} ${this.currency}`)
            return
        }
        const getWithdrawals = this.redis.multi()
        const getDeposits = this.redis.multi()
        for (let i = 0; i < nSwaps; i++) {
            getWithdrawals.lpop(withdrawalQueueKey)
            getDeposits.lpop(depositQueueKey)
        }
        const depositIds = await getDeposits.execAsync()
        const withdrawalIds = await getWithdrawals.execAsync()
        const associateSwapReqs = this.redis.multi()
        for (let i = 0; i < nSwaps; i++) {
            const depositId = depositIds[i]
            const withdrawalId = withdrawalIds[i]
            associateSwapReqs.hset(depositId, 'counterSwapId', withdrawalId)
            associateSwapReqs.hset(withdrawalId, 'counterSwapId', depositId)
            associateSwapReqs.expire(depositId, SWAP_EXPIRY)
            associateSwapReqs.expire(withdrawalId, SWAP_EXPIRY)
        }
        await associateSwapReqs.execAsync()
    }

    _makeSwapReqId({swapSize, side}) {
        return `${side}::${this.currency}:${swapSize}:${UUID.v4()}`;
    }

    _makeSwapQueueKey({swapSize, side}) {
        return `swapQueue::${this.currency}:${swapSize}:${side}`;
    }

    async addSwap({amount, side, stellarAccount}) {
        const keyInfo = {swapSize: amount, side};
        const swapId = this._makeSwapReqId(keyInfo)
        // for example: swapQueue::ETH:0.1:deposit
        const swapQueueKey = this._makeSwapQueueKey(keyInfo)
        const batch = this.redis.multi()
        batch.hmset(swapId, {
            localAccount: stellarAccount,
        })
        batch.expire(swapId, SWAP_EXPIRY)
        batch.rpush(swapQueueKey, swapId)
        const res = await batch.execAsync()
        return {swapId}
    }

    async getSwapMatch({swapId}) {
        const swapInfo = await this.redis.hgetallAsync(swapId)

    }
}
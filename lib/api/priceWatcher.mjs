import BigNumber from 'bignumber.js'

import Binance from 'node-binance-api'

export default class PriceWatcher {
    constructor({redis}) {
        this.redis = redis
    }

    startWatching() {
        this._watchPair('XLMETH')
    }

    _makePriceCacheKey(currencyPair) {
        return `priceCache::${currencyPair}`
    }

    _watchPair(currencyPair) {
        Binance.websockets.depthCache([currencyPair], async(symbol, depth) => {
            const bid = Object.keys(depth.bids)
                .reduce((max, bid) => BigNumber(bid).gt(max) ? bid : max, '-1')
            const ask = Object.keys(depth.asks)
                .reduce((min, ask) => BigNumber(ask).lt(min) ? ask : min, 'Infinity')
            const priceCacheKey = this._makePriceCacheKey(currencyPair)
            await this.redis.hmsetAsync(priceCacheKey, {bid, ask})
        })
    }

    async retrievePrices(currencyPair) {
        const priceCacheKey = this._makePriceCacheKey(currencyPair)
        const cachedPrices = await this.redis.hgetallAsync(priceCacheKey)
        return cachedPrices
    }
}

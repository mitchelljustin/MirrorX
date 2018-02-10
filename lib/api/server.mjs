import supportedSwaps from '../supportedSwaps.mjs'
import createRedisClient from './createRedisClient.mjs'
import MatchingEngine from "./matchingEngine.mjs"
import {SwapRequest} from './structs.mjs'

import {Stellar} from '../stellar.mjs'
import Koa from 'koa'
import Router from 'koa-router'
import BodyParser from 'koa-bodyparser'
import validateStruct from 'koa-superstruct'

export default class ApiServer {
    constructor({redisUri}) {
        this.matchingEngines = {}
        this.redis = createRedisClient({redisUri})
        this.app = new Koa()
        this.app.use(async (ctx, next) => {
            const start = Date.now()
            await next()
            const ms = Date.now() - start
            console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
        })
        this.app.use(BodyParser())
        this.setupRouter()
    }

    setupRouter() {
        const rootRouter = new Router()
        rootRouter.get('/supportedCurrencies', this._getSupportedCurrencies.bind(this))

        const currencyRouter = new Router()
        currencyRouter.use(async (ctx, next) => {
            try {
                await next()
            } catch (e) {
                ctx.status = e.status || 500
                ctx.body = e.message
            }
        })
        currencyRouter.get('/', this._getSwapCurrency.bind(this))
        currencyRouter.post('/', validateStruct(SwapRequest), this._postSwapCurrency.bind(this))

        rootRouter.use('/swap/:currency', this._bindMatchingEngine.bind(this),
            currencyRouter.routes(), currencyRouter.allowedMethods())

        this.app.use(rootRouter.routes())
    }

    startMatchingEngines() {
        const {redis} = this
        for (const currency in supportedSwaps) {
            const {swapSizes} = supportedSwaps[currency]
            this.matchingEngines[currency] = new MatchingEngine({currency, swapSizes, redis})
        }
        // TODO: do this better
        setInterval(this._matchSwaps.bind(this), 5000)
    }

    _matchSwaps() {
        Object.values(this.matchingEngines).forEach(matchingEngine => {
            matchingEngine.tick()
        })
    }

    start({apiPort}) {
        this.startMatchingEngines()
        this.app.listen(apiPort)
        console.log(`Listening on port ${apiPort}`)
    }

    _getSwapCurrency(ctx) {
        ctx.body = 'OK'
    }

    async _postSwapCurrency(ctx, next) {
        const {amount, side, stellarAccount} = ctx.request.body
        if (ctx.matchingEngine.swapSizes.indexOf(amount) === -1) {
            return ctx.throw(400, `Matching engine does not support swap size: ${amount}`)
        }
        if (side !== 'deposit' && side !== 'withdraw') {
            return ctx.throw(400, `Invalid side: ${side}`)
        }
        try {
            Stellar.Keypair.fromPublicKey(stellarAccount)
        } catch (e) {
            return ctx.throw(400, `Invalid Stellar account: ${stellarAccount}`)
        }
        ctx.body = await ctx.matchingEngine.addSwap({amount, side, stellarAccount})
        next()
    }

    _getSupportedCurrencies(ctx) {
        ctx.body = Object.keys(this.matchingEngines)
    }

    _bindMatchingEngine(ctx, next) {
        const currency = ctx.params.currency
        const matchingEngine = this.matchingEngines[currency]
        if (matchingEngine === undefined) {
            return ctx.throw(404, `Currency ${currency} not supported`)
        }
        console.log(`Bound matching engine to context: ${currency}`)
        ctx.matchingEngine = matchingEngine
        next()
    }
}

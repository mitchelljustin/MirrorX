import Express from 'express'
import BodyParser from 'body-parser'

import SwapSpecs from '../swapSpecs.mjs'
import MatchingEngine from "./matchingEngine.mjs"
import {DepositRequest, WithdrawRequest} from './structs.mjs'

export default class ApiServer {
    constructor({port, redis}) {
        this.redis = redis
        this.app = Express()
        this.app.use(BodyParser.json())
        this.currencies = Object.keys(SwapSpecs);
        this._setupMatchingEngines()
        this._setupRoutes()
    }

    _setupMatchingEngines() {
        const {redis} = this
        this.matchingEngines = {}
        this.currencies.forEach(currency => {
            this.matchingEngines[currency] = new MatchingEngine({currency, redis})
        })
    }

    _swapSizeSupported({swapSize, currency}) {
        const {swapSizes} = SwapSpecs[currency]
        return swapSizes.indexOf(swapSize) !== -1
    }

    _setupRoutes() {
        this.app.use((req, res, next) => {
            res.set('Access-Control-Allow-Origin', '*')
            res.set("Access-Control-Allow-Headers",
                "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With")
            console.log(`${new Date().toUTCString()} ${req.method} ${req.path}`)
            next()
        })

        this.app.get('/supportedCurrencies', (req, res) => {
            const supportedCurrencies = this.currencies
            res.send({supportedCurrencies})
        })

        const swapRouter = Express.Router()

        swapRouter.get('/', (req, res) => {
            res.send('OK')
        })

        swapRouter.post('/deposit', (req, res, next) => {
            let depositReq
            try {
                depositReq = DepositRequest(req.body)
            } catch (e) {
                return res.status(400).send(e.message)
            }
            if (!this._swapSizeSupported({swapSize: depositReq.swapSize, currency: req.currency})) {
                return res.status(400).send(`Unsupported swap size: ${depositReq.swapSize}`)
            }
            req.matchingEngine.addDepositReq(depositReq)
                .then(async ({swapReqId}) => {
                    res.send({swapReqId})
                })
                .catch(next)
        })

        swapRouter.post('/withdraw', (req, res, next) => {
            let withdrawReq
            try {
                withdrawReq = WithdrawRequest(req.body)
            } catch (e) {
                return res.status(400).send(e.message)
            }
            if (!this._swapSizeSupported({swapSize: withdrawReq.swapSize, currency: req.currency})) {
                return res.status(400).send(`Unsupported swap size: ${withdrawReq.swapSize}`)
            }
            req.matchingEngine.addWithdrawReq(withdrawReq)
                .then(({swapReqId}) => {
                    res.send({swapReqId})
                })
                .catch(next)
        })

        swapRouter.get('/match/:swapReqId', (req, res, next) => {
            const {swapReqId} = req.params
            req.matchingEngine.getSwapInfo({swapReqId})
                .then(({status, reqInfo, swapInfo}) => {
                    if (status === 'notFound') {
                        return res.status(404).send('Swap not found')
                    }
                    res.send({status, reqInfo, swapInfo})
                    next()
                })
                .catch(next)
        })

        const attachMatchingEngine = (req, res, next) => {
            const currency = req.params.currency
            const matchingEngine = this.matchingEngines[currency]
            if (matchingEngine === undefined) {
                res.status(404).send(`Unsupported currency: ${currency}`)
                return
            }
            req.matchingEngine = matchingEngine
            req.currency = req.params.currency
            next()
        }

        this.app.use('/swap/:currency', attachMatchingEngine, swapRouter)
    }

    start({port}) {
        this.app.listen(port, () => {
            console.log(`Listening on port ${port}`)
        })
    }
}
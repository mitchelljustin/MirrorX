import Express from 'express'
import BodyParser from 'body-parser'

import SwapSpecs from '../swapSpecs.mjs'
import MatchingEngine from './matchingEngine.mjs'
import {DepositRequest, WithdrawRequest, StoreRefundTxRequest} from './structs.mjs'
import RefundStore from './refundStore'

function parseStruct(structType) {
    return (req, res, next) => {
        let struct
        try {
            struct = structType(req.body)
        } catch (e) {
            return res.status(400).send(e.message)
        }
        req.struct = struct
        next()
    }
}

export default class ApiServer {
    constructor({port, redis}) {
        this.redis = redis
        this.app = Express()
        this.refundStore = new RefundStore({redis})
        this.app.use(BodyParser.json())
        this.currencies = Object.keys(SwapSpecs)
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
            res.set('Access-Control-Allow-Headers',
                'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With')
            const now = new Date()
            console.log(`${now} ${req.method} ${req.path}`)
            next()
        })

        this.app.get('/', (req, res) => {
            res.send('OK')
        })

        this.app.get('/supportedCurrencies', (req, res) => {
            const supportedCurrencies = this.currencies
            res.send({supportedCurrencies})
        })

        this.app
            .post('/refundTx', parseStruct(StoreRefundTxRequest), (req, res, next) => {
                const {xdr} = req.struct
                this.refundStore.save({xdr})
                    .then(({hash}) => res.send({hash}))
                    .catch(next)
            })
            .get('/refundTx/:hash', (req, res, next) => {
                const {hash} = req.params
                this.refundStore.retrieve({hash})
                    .then((xdr) => res.send({xdr}))
                    .catch(next)
            })


        const swapRouter = Express.Router()

        swapRouter.get('/', (req, res) => {
            res.send('OK')
        })

        swapRouter.post('/deposit', parseStruct(DepositRequest), (req, res, next) => {
            if (!this._swapSizeSupported({swapSize: req.struct.swapSize, currency: req.currency})) {
                return res.status(400).send(`Unsupported swap size: ${req.struct.swapSize}`)
            }
            req.matchingEngine.addDepositReq(req.struct)
                .then(async ({swapReqId}) => {
                    res.send({swapReqId})
                })
                .catch(next)
        })

        swapRouter.post('/withdraw', parseStruct(WithdrawRequest), (req, res, next) => {
            if (!this._swapSizeSupported({swapSize: req.struct.swapSize, currency: req.currency})) {
                return res.status(400).send(`Unsupported swap size: ${req.struct.swapSize}`)
            }
            req.matchingEngine.addWithdrawReq(req.struct)
                .then(({swapReqId}) => {
                    res.send({swapReqId})
                })
                .catch(next)
        })

        swapRouter.get('/match/:swapReqId', (req, res, next) => {
            const {swapReqId} = req.params
            req.matchingEngine.getSwapInfo({swapReqId})
                .then(({status, ...rest}) => {
                    if (status === 'notFound') {
                        return res.status(404).send('Swap not found')
                    }
                    res.send({status, ...rest})
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
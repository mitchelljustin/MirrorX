import Express from 'express'
import BodyParser from 'body-parser'

import supportedCurrencies from '../supportedCurrencies.mjs'
import MatchingEngine from "./matchingEngine.mjs"
import {SwapRequest} from './structs.mjs'

export default class ApiServer {
    constructor({port, redis}) {
        this.redis = redis
        this.app = Express()
        this.app.use(BodyParser.json())
        this.currencies = Object.keys(supportedCurrencies);
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

    _setupRoutes() {
        this.app.get('/supportedCurrencies', (req, res) => {
            const supportedCurrencies = this.currencies
            res.send({supportedCurrencies})
        })

        const swapRouter = Express.Router()

        swapRouter.get('/', (req, res) => {
            res.send('OK')
        })

        swapRouter.post('/', (req, res, next) => {
            let swapReq
            try {
                swapReq = SwapRequest(req.body)
            } catch (e) {
                return res.status(400).send(e.message)
            }
            const {swapSizes} = supportedCurrencies[req.matchingEngine.currency]
            if (swapSizes.indexOf(swapReq.amount) === -1) {
                return res.status(400).send(`Unsupported swap size: ${swapReq.amount}`)
            }
            req.matchingEngine.addSwap(swapReq)
                .then(({swapId}) => {
                    res.send({swapId})
                    next()
                })
                .catch(next)
        })

        swapRouter.get('/:swapId', (req, res, next) => {
            const {swapId} = req.params
            req.matchingEngine.getSwapMatch({swapId})
                .then((swap) => {
                    if (swap === null) {
                        return res.status(404).send('No match found for swap')
                    }
                    res.send(swap)
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
import BigNumber from 'bignumber.js'
import Binance from 'node-binance-api'
import Bluebird from 'bluebird'

Bluebird.promisifyAll(Binance)

import {Stellar, stellar} from './stellar.mjs'

const UPDATE_OFFER_PRICE_INTERVAL = 15 * 60 * 1000

export default class Anchor {
    constructor({keypair, asset, currencyPair}) {
        this.keypair = keypair
        this.currencyPair = currencyPair
        this.asset = asset
    }

    runForever() {
        console.log(`Anchor for ${this.asset.getCode()}`)
        console.log(`Distributor public key: ${this.keypair.publicKey()}`)
        console.log(`Binance currency pair: ${this.currencyPair}`)
        this.updateOfferPrice()
    }

    async getActiveOffers() {
        const offers = await stellar.offers('accounts', this.keypair.publicKey()).call()
        let sellOffer = null, buyOffer = null
        for (const offer of offers.records) {
            const {buying, selling} = offer
            if (selling.asset_code === this.asset.getCode() &&
                selling.asset_issuer === this.asset.getIssuer() &&
                buying.asset_type === 'native') {
                sellOffer = offer
            }
            if (buying.asset_code === this.asset.getCode() &&
                buying.asset_issuer === this.asset.getIssuer() &&
                selling.asset_type === 'native') {
                buyOffer = offer
            }
        }
        return {sellOffer, buyOffer}
    }

    async getBalances() {
        const account = await stellar.loadAccount(this.keypair.publicKey())
        let xlmBalance = null, assetBalance = null, assetLimit = null
        for (const bal of account.balances) {
            if (bal.asset_type === 'native') {
                xlmBalance = bal.balance
            }
            if (bal.asset_code === this.asset.getCode() &&
                bal.asset_issuer === this.asset.getIssuer()) {
                ({balance: assetBalance, limit: assetLimit} = bal)
            }
        }
        return {xlmBalance, assetBalance, assetLimit}
    }

    async manageOffers({xlmBalance, assetBalance, assetLimit, askPrice, bidPrice, sellOfferId, buyOfferId}) {
        const remainingLimit = BigNumber(assetLimit).minus(assetBalance)
        const buyAmount = BigNumber.min(BigNumber(xlmBalance), remainingLimit.div(bidPrice))
        const sellAmount = BigNumber(assetBalance)
        const account = await stellar.loadAccount(this.keypair.publicKey())
        const builder = new Stellar.TransactionBuilder(account)
        if (sellOfferId !== 0) {
            builder.addOperation(Stellar.Operation.manageOffer({
                selling: this.asset,
                buying: Stellar.Asset.native(),
                price: '1',
                amount: '0',
                offerId: sellOfferId,
            }))
        }
        if (buyOfferId !== 0) {
            builder.addOperation(Stellar.Operation.manageOffer({
                selling: Stellar.Asset.native(),
                buying: this.asset,
                price: '1',
                amount: '0',
                offerId: buyOfferId,
            }))
        }
        const newOffers = []
        if (!sellAmount.isZero()) {
            const amount = sellAmount.toFixed(7)
            const price = bidPrice.pow(-1).toFixed(7)
            const selling = this.asset
            const buying = Stellar.Asset.native()
            const code = this.asset.getCode()
            console.log(`Selling ${amount} ${code} at ${price} XLM per ${code}`)
            builder.addOperation(Stellar.Operation.manageOffer({
                amount, price, selling, buying, offerId: 0,
            }))
        }
        if (!buyAmount.isZero()) {
            const amount = buyAmount.toFixed(7)
            const price = askPrice.toFixed(7)
            const selling = Stellar.Asset.native()
            const buying = this.asset
            const code = this.asset.getCode()
            const priceInverse = askPrice.pow(-1).toFixed(7)
            console.log(`Buying  ${remainingLimit.toFixed(7)} ${code} at ${priceInverse} XLM per ${code}`)
            builder.addOperation(Stellar.Operation.manageOffer({
                amount, price, selling, buying, offerId: 0,
            }))
        }
        for (const offer of newOffers) {
            builder.addOperation(Stellar.Operation.manageOffer({
                ...offer,
                offerId: 0,
            }))
        }
        const tx = builder.build()
        tx.sign(this.keypair)
        await stellar.submitTransaction(tx)
    }

    async updateOfferPrice() {
        const start = new Date()
        console.log(`Updating offer price at ${start}`)
        try {
            const {xlmBalance, assetBalance, assetLimit} = await this.getBalances()
            console.log(`Anchor balances: ${xlmBalance} XLM, ${assetBalance} (/ ${assetLimit}) ${this.asset.getCode()}`)
            let {askPrice, bidPrice} = await Binance.bookTickersAsync(this.currencyPair)
            askPrice = BigNumber(askPrice)
            bidPrice = BigNumber(bidPrice)
            const spread = askPrice.div(bidPrice).minus(1)
            console.log(`Current external prices: ask=${askPrice}, bid=${bidPrice}, spread=${spread.times(100).toFixed(4)}%`)
            const {sellOffer, buyOffer} = await this.getActiveOffers()
            const sellOfferId = sellOffer !== null ? sellOffer.id : 0
            const buyOfferId = buyOffer !== null ? buyOffer.id : 0
            console.log(`Offer IDs: sell=${sellOfferId}, buy=${buyOfferId}`)
            await this.manageOffers({
                xlmBalance, assetBalance, assetLimit, askPrice, bidPrice, buyOfferId, sellOfferId,
            })
            const end = new Date()
            console.log(`Done, took ${(end.getTime() - start.getTime())}ms`)
        } catch (e) {
            console.error('***ERROR***')
            if (e.data && e.data.extras && e.data.extras.result_codes) {
                console.error(JSON.stringify(e.data.extras.result_codes, null, 2))
            } else {
                console.error(e.message)
            }
            setImmediate(this.updateOfferPrice.bind(this))
        }
        setTimeout(this.updateOfferPrice.bind(this), UPDATE_OFFER_PRICE_INTERVAL)
    }
}
import Crypto from 'crypto'

import {stellar, Stellar} from "../stellar";
import config from '../../config/config'
import XMSwap from '../xmSwap'

const SWAP_ACT_NUM_ENTRIES = 5
const SWAP_ACT_BASE_RESERVE = (1.0 + 0.5 * SWAP_ACT_NUM_ENTRIES).toFixed(7)

const SWAP_ACT_REFUND_DELAY = 5 * 60

const SWAP_CONTRACT_TIMELIMIT = 24 * 60 * 60

const XETH = new Stellar.Asset('XETH', config.stellar.accounts.issuer)

class SwapOut {
    constructor({amount, stellar_fulfiller, stellar_prep_secret, outside_preparer, outside_fulfiller}) {
        this.swapSize = amount
        this.stellarPreparer = Stellar.Keypair.fromSecret(stellar_prep_secret)
        this.stellarFulfiller = Stellar.Keypair.fromPublicKey(stellar_fulfiller)
        this.ethPreparer = outside_preparer
        this.ethFulfiller = outside_fulfiller
    }

    async run() {
        const swapSize = this.swapSize
        const {preimage, hashlock} = this.makeHashlock()
        console.log(`Hashlock: ${hashlock.toString('hex')}`)
        console.log(`Preimage: ${preimage.toString('hex')}`)
        const {swapKeys} = this.makeSwapKeys()
        console.log(`Stellar Swap account: ${swapKeys.publicKey()}`)
        const {swapRefundTx} = await this.genStellarSwapRefundTx({swapSize, swapKeys})
        console.log(`Stellar Swap refund tx: ${swapRefundTx.hash().toString('hex')}`)
        // TODO: publish swapRefundTx to Fulfiller
        const {lockFundsTx} = await this.genStellarSwapAccount({hashlock, swapSize, swapKeys, swapRefundTx})

        const {eventLog} = await this.waitForEthCommitment({swapSize, hashlock})
        console.log(`Detected swap on Ethereum contract: ${eventLog.args}`)

    }

    makeHashlock() {
        const preimage = Crypto.randomBytes(32)
        const h = Crypto.createHash('sha256')
        h.update(preimage)
        const hashlock = h.digest()
        return {preimage, hashlock}
    }

    makeSwapKeys() {
        const swapKeys = Stellar.Keypair.random()
        return {swapKeys}
    }

    async genStellarSwapRefundTx({swapSize, swapKeys}) {
        const lastLedger = await stellar.ledgers().order('desc').limit(1).call()
        const timestamp = new Date(lastLedger.records[0].closed_at).getTime()
        const preparer = await stellar.loadAccount(this.stellarPreparer.publicKey())
        const minTime = timestamp + SWAP_ACT_REFUND_DELAY;
        const swapRefundTxOptions = {
            timebounds: {
                maxTime: minTime + 365 * 24 * 60 * 60,
                minTime,
            }
        }
        const swapRefundTx = new Stellar.TransactionBuilder(preparer, swapRefundTxOptions)
            .addOperation(Stellar.Operation.payment({
                destination: this.stellarPreparer.publicKey(),
                amount: swapSize,
                asset: XETH,
            }))
            .addOperation(Stellar.Operation.changeTrust({
                asset: XETH,
                limit: '0',
            }))
            .addOperation(Stellar.Operation.accountMerge({
                destination: this.stellarPreparer.publicKey(),
            }))
            .build()
        return {swapRefundTx}
    }

    async genStellarSwapAccount({hashlock, swapSize, swapKeys, swapRefundTx}) {
        const preparerAct = this.stellarPreparer.publicKey()
        const fulfillerAct = this.stellarFulfiller.publicKey()
        const swapAct = swapKeys.publicKey()

        const preparer = await stellar.loadAccount(preparerAct)

        const lockFundsTx = new Stellar.TransactionBuilder(preparer)
            .addOperation(Stellar.Operation.createAccount({
                destination: swapAct,
                startingBalance: SWAP_ACT_BASE_RESERVE,
                source: preparerAct,
            }))
            .addOperation(Stellar.Operation.changeTrust({
                asset: XETH,
                limit: swapSize,
                source: swapAct,
            }))
            .addOperation(Stellar.Operation.payment({
                destination: swapAct,
                asset: XETH,
                amount: swapSize,
                source: preparerAct,
            }))
            .addOperation(Stellar.Operation.setOptions({
                signer: {
                    preAuthTx: swapRefundTx.hash(),
                    weight: 2,
                },
                source: swapAct,
            }))
            .addOperation(Stellar.Operation.setOptions({
                signer: {
                    ed25519PublicKey: fulfillerAct,
                    weight: 1,
                },
                source: swapAct,
            }))
            .addOperation(Stellar.Operation.setOptions({
                signer: {
                    sha256Hash: hashlock,
                    weight: 1,
                },
                source: swapAct,
            }))
            .addOperation(Stellar.Operation.setOptions({
                masterWeight: 0,
                lowThreshold: 2,
                medThreshold: 2,
                highThreshold: 2,
                source: swapAct,
            }))
            .build()
        lockFundsTx.sign(swapKeys)
        lockFundsTx.sign(this.stellarPreparer)
        await stellar.submitTransaction(lockFundsTx)
        console.log(`Submitted lock funds tx: ${lockFundsTx.hash().toString('hex')}`)
        return {lockFundsTx}
    }

    async waitForEthCommitment({swapSize, hashlock}) {
        console.log(`Waiting for prepareSwap with hashlock 0x${hashlock.toString('hex')}`)
        const targetHashlock = `0x${hashlock.toString('hex')}`
        const contract = await XMSwap.deployed()
        let done = false
        return new Promise((resolve, reject) => {
            contract.SwapPrepared().watch(scanForSwap.bind(this))

            function scanForSwap(err, eventLog) {
                if (done) {
                    return
                }
                if (err) {
                    reject(err)
                    done = true
                    return
                }
                if (eventLog.args.hashlock !== targetHashlock) {
                    return
                }
                const validValue = eventLog.args.value.div(1e18).eq(swapSize);
                const validRecipient = eventLog.args.recipient === this.ethFulfiller;
                // TODO: check expiry
                if (validRecipient && validValue) {
                    resolve({eventLog})
                    done = true
                } else {
                    reject(`Swap invalid: ${JSON.stringify(eventLog.args)}`)
                    done = true
                }
            }
        })
    }

    async executeSwap({preimage, hashlock, swapKeys, swapSize}) {
        // Alice claims her ETH
        const contract = await XMSwap.deployed()
        let ethRes = await contract.fulfillSwap(
            `0x${preimageHex}`,
            {
                from: this.keys.eth.alice.address,
            }
        )
        console.log(`Alice claimed her ${swapSize} ETH (Ethereum) on address ${this.keys.eth.alice.address}`)
        return {xethRes, ethRes}
    }
}


class SwapIn {
    constructor({amount, stellar_ful_secret, stellar_preparer, outside_preparer, outside_fulfiller}) {
        this.swapSize = amount
        this.stellarPreparer = Stellar.Keypair.fromPublicKey(stellar_preparer)
        this.stellarFulfiller = Stellar.Keypair.fromSecret(stellar_ful_secret)
        this.ethPreparer = outside_preparer
        this.ethFulfiller = outside_fulfiller
    }

    async run() {
        const {swapAcct} = await this.waitForSwapAccount()


    }

    async waitForSwapAccount() {
        const promiseFn = async (reject, resolve) => {
            const latestLedger = await stellar.ledgers().limit(1).order('desc').call()

        }
        return new Promise(promiseFn)
    }

    async prepareEthSwap({hashlock, swapSize}) {
        const recipient = this.keys.eth.alice.address
        const sender = this.keys.eth.bob.address
        const timelimit = SWAP_CONTRACT_TIMELIMIT
        const contract = await XMSwap.deployed()
        const wei = parseFloat(swapSize) * 1e18;
        const hashlock0x = `0x${hashlock.toString('hex')}`;
        const gasEstimate = await contract.prepareSwap.estimateGas(
            recipient,
            hashlock0x,
            timelimit,
            {
                from: sender,
                value: wei,
            }
        )
        const res = await contract.prepareSwap(
            recipient,
            hashlock0x,
            timelimit,
            {
                from: sender,
                value: wei,
                gas: gasEstimate,
            }
        )
        console.log(`Successfully prepared swap on Ethereum. TX: ${res.tx}`)
    }

    async fulfillSwap({swapSize, preimage, swapActId}) {
        // Bob claims his XETH

        const fulfiller = await this.stellar.loadAccount(this.stellarFulfiller)
        const fulfillTx = new Stellar.TransactionBuilder(fulfiller)
            .addOperation(Stellar.Operation.payment({
                asset: XETH,
                source: swapActId,
                destination: fulfiller.account_id,
                amount: swapSize,
            }))
            .addOperation(Stellar.Operation.changeTrust({
                asset: XETH,
                source: swapActId,
                limit: '0',
            }))
            .addOperation(Stellar.Operation.accountMerge({
                destination: fulfiller.account_id,
                source: swapActId,
            }))
            .build()
        fulfillTx.sign(this.stellarFulfiller)
        fulfillTx.signHashX(preimage)
        await stellar.submitTransaction(fulfillTx)
        console.log(`Fulfiller ${fulfiller.account_id} claimed their ${swapSize} XETH (Stellar)`)
        return {fulfillTx}
    }
}

export default {SwapIn, SwapOut}
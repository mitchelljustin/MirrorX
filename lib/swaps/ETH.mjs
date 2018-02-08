import Crypto from 'crypto'
import BigNumber from 'bignumber.js'

import {stellar, Stellar} from "../stellar";
import config from '../../config/config'
import XMSwap from '../xmSwap'

const SWAP_ACT_NUM_ENTRIES = 5
const SWAP_ACT_BASE_RESERVE = (1.0 + 0.5 * SWAP_ACT_NUM_ENTRIES).toFixed(7)

const SWAP_ACT_REFUND_DELAY = 5 * 60

const SWAP_CONTRACT_TIMELIMIT = 24 * 60 * 60

const XETH = new Stellar.Asset('XETH', config.stellar.accounts.issuer)

function log() {
    console.log(new Date().toISOString(), ...arguments)
}

class Withdraw {
    constructor({amount, stellar_fulfiller, stellar_preparer, outside_preparer, outside_fulfiller}) {
        this.swapSize = BigNumber(amount)
        this.stellarPreparer = Stellar.Keypair.fromSecret(stellar_preparer)
        this.stellarFulfiller = Stellar.Keypair.fromPublicKey(stellar_fulfiller)
        this.ethPreparer = outside_preparer
        this.ethFulfiller = outside_fulfiller
    }

    async run() {
        const swapSize = this.swapSize
        log(`Swapping ${swapSize} XETH out of Stellar and into Ethereum`)
        const {stellarPreparer, stellarFulfiller, ethPreparer, ethFulfiller} = this
        log(JSON.stringify({
            stellarPreparer: stellarPreparer.publicKey(),
            stellarFulfiller: stellarFulfiller.publicKey(),
            ethPreparer,
            ethFulfiller
        }, null, 2))
        const {preimage, hashlock} = this.makeHashlock()
        log(`Hashlock: ${hashlock.toString('hex')}, preimage: ${preimage.toString('hex')}`)
        const {swapKeys} = this.makeSwapKeys()
        log(`Stellar Swap account: ${swapKeys.publicKey()}`)
        const {swapRefundTx} = await this.genStellarSwapRefundTx({swapSize, swapKeys})
        log(`Stellar Swap refund tx: ${swapRefundTx.hash().toString('hex')}`)
        // TODO: publish swapRefundTx to Fulfiller
        const {lockFundsTx} = await this.genStellarSwapAccount({hashlock, swapSize, swapKeys, swapRefundTx})
        log(`Locked funds in Swap account, tx: ${lockFundsTx.hash().toString('hex')}`)
        log("Waiting for preparer to prepare swap on Ethereum contract..")
        const {eventLog} = await this.waitForEthPrepareSwap({swapSize, hashlock})
        log(`Detected swap on Ethereum contract: ${JSON.stringify(eventLog.args)}`)
        const {tx} = await this.fulfillEthereumSwap({preimage})
        log(`Claimed ${swapSize} ETH from Ethereum contract, tx: ${tx}. Preimage is now public`)
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
        // TODO: fix, should be swap, not preparer
        const swapRefundTx = new Stellar.TransactionBuilder(preparer, swapRefundTxOptions)
            .addOperation(Stellar.Operation.payment({
                destination: this.stellarPreparer.publicKey(),
                amount: swapSize.toString(),
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
                limit: swapSize.toString(),
                source: swapAct,
            }))
            .addOperation(Stellar.Operation.payment({
                destination: swapAct,
                asset: XETH,
                amount: swapSize.toString(),
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
        return {lockFundsTx}
    }

    async waitForEthPrepareSwap({swapSize, hashlock}) {
        log(`Waiting for prepareSwap with hashlock 0x${hashlock.toString('hex')}`)
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
                const validValue = eventLog.args.value.div(1e18).eq(swapSize)
                const validRecipient = eventLog.args.recipient.toLowerCase() === this.ethFulfiller.toLowerCase()
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

    async fulfillEthereumSwap({preimage}) {
        const contract = await XMSwap.deployed()
        const preimageHex = `0x${preimage.toString('hex')}`;
        const {tx} = await contract.fulfillSwap(
            preimageHex,
            {
                from: this.ethFulfiller,
            }
        )
        return {tx}
    }
}



class Deposit {
    constructor({amount, stellar_fulfiller, stellar_preparer, outside_preparer, outside_fulfiller}) {
        this.swapSize = BigNumber(amount)
        this.stellarPreparer = Stellar.Keypair.fromPublicKey(stellar_preparer)
        this.stellarFulfiller = Stellar.Keypair.fromSecret(stellar_fulfiller)
        this.ethPreparer = outside_preparer
        this.ethFulfiller = outside_fulfiller
    }

    async run() {
        const swapSize = this.swapSize
        log(`Swapping ${swapSize} ETH out of Ethereum and into Stellar`)
        const {stellarPreparer, stellarFulfiller, ethPreparer, ethFulfiller} = this
        log(JSON.stringify({
            stellarPreparer: stellarPreparer.publicKey(),
            stellarFulfiller: stellarFulfiller.publicKey(),
            ethPreparer,
            ethFulfiller
        }, null, 2))
        const {swapAccount, hashlock} = await this.waitForSwapAccount({swapSize})
        log(`Found swap account ${swapAccount.id} with hashlock ${hashlock.toString('hex')}`)
        log("Preparing swap on Ethereum contract")
        const {tx} = await this.prepareEthSwap({swapSize, hashlock})
        log(`Successfully prepared swap on Ethereum, tx: ${tx}`)
        log("Waiting for counterparty to fulfill Ethereum swap and show preimage")
        const {preimage} = await this.waitForEthSwapFulfillment({hashlock})
        log(`Ethereum swap fulfilled, got preimage! ${preimage.toString('hex')}`)
        const {fulfillTx} = await this.fulfillStellarSwap({swapSize, preimage, swapAccount})
        log(`Claimed ${swapSize} XETH on Stellar, tx: ${fulfillTx.hash().toString('hex')}`)
    }

    async processLockFundsTx({tx, swapSize}) {
        const operations = (await tx.operations())._embedded.records
        let swapAccountId
        let createSwapAcct, trustAsset, payAsset, addRefundTx, addFulfiller, addHashlock, adjustSignerWeights
        const checks = [
            () => {
                if (operations.length !== 7) {
                    return false
                }
                [
                    createSwapAcct,
                    trustAsset,
                    payAsset,
                    addRefundTx,
                    addFulfiller,
                    addHashlock,
                    adjustSignerWeights,
                ] = operations
                return true
            },
            () => createSwapAcct.type === 'create_account',
            () => createSwapAcct.funder === tx.source_account,
            () => {
                swapAccountId = createSwapAcct.account
                return true
            },
            () => trustAsset.type === 'change_trust',
            () => trustAsset.asset_code === XETH.getCode(),
            () => trustAsset.asset_issuer === XETH.getIssuer(),
            () => payAsset.type === 'payment',
            () => BigNumber(payAsset.amount).eq(swapSize),
            () => payAsset.asset_code === XETH.getCode(),
            () => payAsset.asset_issuer === XETH.getIssuer(),
            // TODO: check refund hash in operations[3]
            () => addFulfiller.type === 'set_options',
            () => addFulfiller.signer_key === this.stellarFulfiller.publicKey(),
            () => addFulfiller.signer_weight === 1,
            () => addHashlock.type === 'set_options',
            () => addHashlock.signer_key[0] === 'X',
            () => addHashlock.signer_weight === 1,
            () => adjustSignerWeights.type === 'set_options',
            () => adjustSignerWeights.master_key_weight === 0,
            () => adjustSignerWeights.low_threshold === 2,
            () => adjustSignerWeights.med_threshold === 2,
            () => adjustSignerWeights.high_threshold === 2,
        ]
        for (const i in checks) {
            const checkFn = checks[i]
            if (!checkFn()) {
                log(`Not a lock funds tx: check ${i} failed`)
                return null
            }
        }
        const swapAccount = await stellar.loadAccount(swapAccountId)
        const hasFunds = swapAccount.balances.some(bal => {
            return bal.asset_code === XETH.getCode() &&
                bal.asset_issuer === XETH.getIssuer() &&
                BigNumber(bal.balance).eq(swapSize)
        })
        if (!hasFunds) {
            log(`Swap account does not have funds`)
            return null
        }
        const hashlockSigners = swapAccount.signers.filter(
            signer => signer.type === 'sha256_hash'
        )
        if (hashlockSigners.length !== 1) {
            log(`Swap account does not have hashlock`)
            return null
        }
        const hashlock = Stellar.StrKey.decodeSha256Hash(hashlockSigners[0].public_key)
        return {swapAccount, hashlock}
    }

    async waitForSwapAccount({swapSize}) {
        return new Promise(async (resolve, reject) => {
            const latestLedger = await stellar.ledgers().limit(1).order('desc').call()
            const {sequence} = latestLedger.records[0]
            const startSequence = sequence - 20
            const startLedger = await stellar.ledgers().ledger(startSequence).call()
            const {paging_token} = startLedger
            const close = stellar.transactions()
                .forAccount(this.stellarPreparer.publicKey())
                .cursor(paging_token)
                .stream({
                    onmessage: async (tx) => {
                        let res = await this.processLockFundsTx({tx, swapSize})
                        if (res === null) {
                            return
                        }
                        close()
                        resolve(res)
                    },
                    onerror: (err) => {
                        close()
                        reject(err)
                    }
                })
        })
    }

    async prepareEthSwap({hashlock, swapSize}) {
        const recipient = this.ethFulfiller
        const sender = this.ethPreparer
        const timelimit = SWAP_CONTRACT_TIMELIMIT
        const contract = await XMSwap.deployed()
        const wei = swapSize.times(1e18).toString()
        const hashlock0x = `0x${hashlock.toString('hex')}`
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
        return res
    }

    async waitForEthSwapFulfillment({hashlock}) {
        const contract = await XMSwap.deployed()
        const targetHashlock = `0x${hashlock.toString('hex')}`
        return new Promise(async (resolve, reject) => {
            let done = false
            contract.SwapFulfilled().watch((err, eventLog) => {
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
                done = true
                const preimage = new Buffer(eventLog.args.preimage.slice(2), 'hex')
                resolve({preimage})
            })
        })
    }

    async fulfillStellarSwap({swapSize, preimage, swapAccount}) {
        // Fulfiller claims their XETH
        const swapActId = swapAccount.id
        const fulfiller = await stellar.loadAccount(this.stellarFulfiller.publicKey())
        const fulfillTx = new Stellar.TransactionBuilder(fulfiller)
            .addOperation(Stellar.Operation.payment({
                asset: XETH,
                source: swapActId,
                destination: fulfiller.account_id,
                amount: swapSize.toString(),
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
        return {fulfillTx}
    }
}

const supportedSwapSizes = [
    '0.1',
]

export default {Deposit, Withdraw, supportedSwapSizes}
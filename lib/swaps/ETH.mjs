import Crypto from 'crypto'
import BigNumber from 'bignumber.js'

import {stellar, Stellar} from '../stellar'
import EthSwapContract from '../ethSwapContract'

const HOLDING_ACCOUNT_NUM_ENTRIES = 6
const HOLDING_ACCOUNT_BASE_RESERVE = (1.0 + 0.5 * HOLDING_ACCOUNT_NUM_ENTRIES + 0.0005).toFixed(7)

const WITHDRAW_REFUND_DELAY = 48 * 60 * 60

const SWAP_CONTRACT_TIMELIMIT = 24 * 60 * 60

const swapSizes = [
    '0.01',
    '0.1',
]

const XETH = new Stellar.Asset('XETH', process.env.STELLAR_ISSUER)

function makeHashlock() {
    const preimage = Crypto.randomBytes(32)
    const h = Crypto.createHash('sha256')
    h.update(preimage)
    const hashlock = h.digest()
    return {preimage, hashlock}
}

function makeHoldingKeys() {
    const holdingKeys = Stellar.Keypair.random()
    return {holdingKeys}
}

async function loadXethBalance({publicKey, account}) {
    if (!publicKey && !account) {
        throw new Error('Must pass either publicKey or account')
    }
    let bal = null
    if (!account) {
        try {
            account = await stellar.loadAccount(publicKey)
        } catch (e) {
            if (e.status !== 404) {
                throw e
            }
        }
    }
    bal = account.balances.find(b => b.asset_code === XETH.getCode() && b.asset_issuer === XETH.getIssuer())
    let balance = '0', limit = '0'
    if (bal) {
        ({balance, limit} = bal)
    } else {
        balance = '0'
        limit = '0'
    }
    return {
        balance: BigNumber(balance),
        limit: BigNumber(limit),
    }
}

async function genStellarRefundTx({
                                      hashlock,
                                      holdingAccount,
                                      depositorAccount,
                                      withdrawerAccount,
                                  }) {
    const withdrawer = await stellar.loadAccount(withdrawerAccount)
    const minTime = Math.round(new Date().getTime() / 1000) + WITHDRAW_REFUND_DELAY
    const refundTx = new Stellar.TransactionBuilder(withdrawer, {
        timebounds: {
            minTime,
            maxTime: 0,
        },
    })
        .addOperation(Stellar.Operation.setOptions({
            signer: {
                ed25519PublicKey: depositorAccount,
                weight: 0,
            },
            source: holdingAccount,
        }))
        .addOperation(Stellar.Operation.setOptions({
            signer: {
                sha256Hash: hashlock,
                weight: 0,
            },
            source: holdingAccount,
        }))
        .addOperation(Stellar.Operation.setOptions({
            signer: {
                ed25519PublicKey: withdrawerAccount,
                weight: 1,
            },
            source: holdingAccount,
        }))
        .addOperation(Stellar.Operation.setOptions({
            lowThreshold: 1,
            medThreshold: 1,
            highThreshold: 1,
            source: holdingAccount,
        }))
        .build()
    return {refundTx}
}

function verifyStellarRefundTx({hash, xdr}) {
    const tx = new Stellar.Transaction(xdr)
    if (tx.hash().toString('hex') !== hash) {
        return null
    }
    const {timeBounds: {minTime}} = tx
    const minTimeSecs = parseInt(minTime)
    const refundDelay = minTimeSecs - Math.round(new Date().getTime() / 1000)
    // One hour grace period
    if (refundDelay <= (WITHDRAW_REFUND_DELAY - 60 * 60)) {
        return null
    }
    return tx
}

async function getAssetPrices() {
    const orderBook = await stellar.orderbook(XETH, Stellar.Asset.native()).call()
    const lowestAsk = orderBook.asks[0]
    const highestBid = orderBook.bids[0]
    const askPrice = BigNumber(lowestAsk ? lowestAsk.price : highestBid.price)
    const bidPrice = BigNumber(highestBid ? highestBid.price : lowestAsk.price)
    return {askPrice, bidPrice}
}

async function genStellarHoldingTx({
                                       hashlock,
                                       swapSize,
                                       holdingAccount,
                                       depositorAccount,
                                       withdrawerAccount,
                                       refundTx,
                                   }) {
    const withdrawer = await stellar.loadAccount(withdrawerAccount)
    const {bidPrice} = await getAssetPrices()
    const reserveWitholding = BigNumber(HOLDING_ACCOUNT_BASE_RESERVE).div(bidPrice)
    const assetBuyAmount = BigNumber(swapSize).minus(reserveWitholding)
    const maxXlmToSpend = bidPrice.times(swapSize).times(1.05) // Make sure we'll have enough XLM to pay
    const xethBalance = await loadXethBalance({account: withdrawer})
    let newXethLimit

    if (xethBalance) {
        newXethLimit = xethBalance.limit
        if (newXethLimit.minus(xethBalance.balance).lt(assetBuyAmount)) {
            newXethLimit = newXethLimit.plus(assetBuyAmount)
        }
    } else {
        newXethLimit = assetBuyAmount
    }

    const paymentSizeStr = assetBuyAmount.toFixed(7, BigNumber.ROUND_UP)
    const holdingTx = new Stellar.TransactionBuilder(withdrawer)
        .addOperation(Stellar.Operation.changeTrust({
            asset: XETH,
            limit: newXethLimit.toFixed(7, BigNumber.ROUND_UP),
            source: withdrawerAccount,
        }))
        .addOperation(Stellar.Operation.pathPayment({
            sendAsset: Stellar.Asset.native(),
            sendMax: maxXlmToSpend.toFixed(7),
            destAsset: XETH,
            destAmount: paymentSizeStr,
            destination: withdrawerAccount,
            path: [],
            source: withdrawerAccount,
        }))
        .addOperation(Stellar.Operation.createAccount({
            destination: holdingAccount,
            startingBalance: HOLDING_ACCOUNT_BASE_RESERVE,
            source: withdrawerAccount,
        }))
        .addOperation(Stellar.Operation.changeTrust({
            asset: XETH,
            limit: paymentSizeStr,
            source: holdingAccount,
        }))
        .addOperation(Stellar.Operation.payment({
            destination: holdingAccount,
            asset: XETH,
            amount: paymentSizeStr,
            source: withdrawerAccount,
        }))
        .addOperation(Stellar.Operation.setOptions({
            signer: {
                ed25519PublicKey: depositorAccount,
                weight: 1,
            },
            source: holdingAccount,
        }))
        .addOperation(Stellar.Operation.setOptions({
            signer: {
                sha256Hash: hashlock,
                weight: 1,
            },
            source: holdingAccount,
        }))
        .addOperation(Stellar.Operation.setOptions({
            signer: {
                preAuthTx: refundTx.hash(),
                weight: 2,
            },
            source: holdingAccount,
        }))
        .addOperation(Stellar.Operation.setOptions({
            masterWeight: 0,
            lowThreshold: 2,
            medThreshold: 2,
            highThreshold: 2,
            source: holdingAccount,
        }))
        .build()

    return {holdingTx}
}

async function genPastLedgerPagingToken({delta}) {
    const latestLedger = await stellar.ledgers().limit(1).order('desc').call()
    const {sequence} = latestLedger.records[0]
    const startSequence = sequence - delta
    const {paging_token: pagingToken} = await stellar.ledgers().ledger(startSequence).call()
    return {pagingToken}
}

async function _executeStellarFilter({filter, processLogFn, wait}) {
    return new Promise(async (resolve, reject) => {
        if (wait) {
            const close = filter.stream({
                onmessage: async (item) => {
                    const processResult = await processLogFn(item)
                    if (!processResult) {
                        return
                    }
                    resolve(processResult)
                    close()
                },
                onerror: (err) => {
                    reject(err)
                    close()
                },
            })
        } else {
            try {
                const filterResult = await filter.call()
                const items = filterResult.records
                for (const item of items) {
                    const processResult = await processLogFn(item)
                    if (!processResult) {
                        continue
                    }
                    return resolve(processResult)
                }
                resolve(null)
            } catch (e) {
                reject(e)
            }
        }
    })
}

async function findStellarHoldingTx({swapSize, withdrawerAccount, holdingAccount, depositorAccount, wait}) {
    const {pagingToken} = await genPastLedgerPagingToken({delta: 1200})
    const filter = stellar
        .transactions()
        .forAccount(withdrawerAccount)
        .cursor(pagingToken)
    const processLogFn = (tx) => processHoldingTx({tx, swapSize, holdingAccount, withdrawerAccount, depositorAccount})
    return await _executeStellarFilter({filter, wait, processLogFn})
}

async function processHoldingTx({tx, swapSize, holdingAccount, withdrawerAccount, depositorAccount}) {
    const operations = (await tx.operations())._embedded.records
    const {askPrice} = await getAssetPrices()
    const reserveWitholding = BigNumber(HOLDING_ACCOUNT_BASE_RESERVE).div(askPrice).times(1.05) // To be safe
    let withdrawerTrustAsset, pathPayment = null,
        createHoldingAcct, trustAsset, assetPayment, addFulfiller, addHashlock, addRefundTx, adjustSignerWeights

    const checks = [
        () => {
            if (operations.length === 7) {
                [
                    createHoldingAcct,
                    trustAsset,
                    assetPayment,
                    addFulfiller,
                    addHashlock,
                    addRefundTx,
                    adjustSignerWeights,
                ] = operations
                return true
            }
            if (operations.length === 9) {
                [
                    withdrawerTrustAsset,
                    pathPayment,
                    createHoldingAcct,
                    trustAsset,
                    assetPayment,
                    addFulfiller,
                    addHashlock,
                    addRefundTx,
                    adjustSignerWeights,
                ] = operations
                return true
            }
            return false
        },
        () => !withdrawerTrustAsset || withdrawerTrustAsset.type === 'change_trust',
        () => !withdrawerTrustAsset || withdrawerTrustAsset.asset_code === XETH.getCode(),
        () => !withdrawerTrustAsset || withdrawerTrustAsset.asset_issuer === XETH.getIssuer(),
        () => !withdrawerTrustAsset || withdrawerTrustAsset.source_account === withdrawerAccount,
        () => !pathPayment || pathPayment.type === 'path_payment',
        () => !pathPayment || pathPayment.from === withdrawerAccount,
        () => !pathPayment || pathPayment.to === withdrawerAccount,
        () => createHoldingAcct.funder === tx.source_account,
        () => createHoldingAcct.account === holdingAccount,
        () => BigNumber(createHoldingAcct.starting_balance).eq(HOLDING_ACCOUNT_BASE_RESERVE),
        () => trustAsset.type === 'change_trust',
        () => trustAsset.asset_code === XETH.getCode(),
        () => trustAsset.asset_issuer === XETH.getIssuer(),
        () => trustAsset.source_account === holdingAccount,
        () => assetPayment.type === 'payment',
        () => BigNumber(assetPayment.amount).plus(reserveWitholding).gte(swapSize),
        () => assetPayment.asset_code === XETH.getCode(),
        () => assetPayment.asset_issuer === XETH.getIssuer(),
        () => assetPayment.from === tx.source_account,
        () => assetPayment.to === holdingAccount,
        () => addFulfiller.type === 'set_options',
        () => addFulfiller.signer_key === depositorAccount,
        () => addFulfiller.signer_weight === 1,
        () => addHashlock.type === 'set_options',
        () => addHashlock.signer_key[0] === 'X',
        () => addHashlock.signer_weight === 1,
        () => addRefundTx.type === 'set_options',
        () => addRefundTx.signer_key[0] === 'T',
        () => addRefundTx.signer_weight === 2,
        () => adjustSignerWeights.type === 'set_options',
        () => adjustSignerWeights.master_key_weight === 0,
        () => adjustSignerWeights.low_threshold === 2,
        () => adjustSignerWeights.med_threshold === 2,
        () => adjustSignerWeights.high_threshold === 2,
    ]
    for (const i in checks) {
        const checkFn = checks[i]
        if (!checkFn()) {
            console.log(`Holding tx ${tx.id} failed at check ${i}`)
            return null
        }
    }
    const hashlock = Stellar.StrKey.decodeSha256Hash(addHashlock.signer_key)
    const refundTxHash = Stellar.StrKey.decodePreAuthTx(addRefundTx.signer_key)
    console.log(`Found holding tx ${tx.id}, hashlock=${hashlock.toString('hex')}, refundTx=${refundTxHash.toString('hex')}`)
    return {refundTxHash, hashlock}
}


async function _executeEthFilter({filter, processLogFn, wait}) {
    return new Promise((resolve, reject) => {
        if (wait) {
            filter.watch((err, eventLog) => {
                if (err) {
                    return reject(err)
                }
                const processRes = processLogFn({eventLog})
                if (processRes === null) {
                    return
                }
                return resolve(processRes)
            })
        } else {
            filter.get((err, eventLogs) => {
                if (err) {
                    return reject(err)
                }
                if (eventLogs.length === 0) {
                    return resolve(null)
                }
                for (const eventLog of eventLogs) {
                    const processRes = processLogFn({eventLog})
                    if (processRes === null) {
                        continue
                    }
                    return resolve(processRes)
                }
                return resolve(null)
            })
        }
    })
}

async function findPrepareSwap({swapSize, hashlock, withdrawerEthAddress, wait}) {
    hashlock = `0x${hashlock.toString('hex')}`
    swapSize = BigNumber(swapSize).times(1e18)
    const recipient = withdrawerEthAddress.toLowerCase()

    const contract = await EthSwapContract.deployed()
    const filter = contract.SwapPrepared({hashlock}, {fromBlock: 0})
    const processLogFn = ({eventLog: {args}}) => {
        if (args.recipient !== recipient) {
            return null
        }
        if (!args.value.eq(swapSize)) {
            return null
        }
        return {validSwap: true}
    }
    return await _executeEthFilter({filter, wait, processLogFn})
}

function prepareSwapParams({hashlock, swapSize, depositorEthAddress, withdrawerEthAddress}) {
    const timelimit = SWAP_CONTRACT_TIMELIMIT
    const wei = BigNumber(swapSize).times(1e18).toString()
    const hashlock0x = `0x${hashlock.toString('hex')}`
    const params = [
        withdrawerEthAddress,
        hashlock0x,
        timelimit,
        {
            from: depositorEthAddress,
            value: wei,
        },
    ]
    const funcName = 'prepareSwap'
    return {funcName, params}
}

function fulfillSwapParams({preimage, withdrawerEthAddress}) {
    const funcName = 'fulfillSwap'
    const preimage0x = `0x${preimage.toString('hex')}`
    const params = [
        preimage0x,
        {
            from: withdrawerEthAddress,
            gas: '60000',
        },
    ]
    return {funcName, params}
}

async function findFulfillSwap({hashlock, wait}) {
    hashlock = `0x${hashlock.toString('hex')}`

    const contract = await EthSwapContract.deployed()
    const filter = contract.SwapFulfilled({hashlock}, {
        fromBlock: 0,
    })
    const processLogFn = ({eventLog: {args: {preimage}}}) => {
        return {preimage}
    }
    return await _executeEthFilter({filter, processLogFn, wait})
}

async function findStellarClaimTx({depositorAccount, holdingAccount, wait}) {
    const {pagingToken} = await genPastLedgerPagingToken({delta: 1200})
    const filter = stellar
        .operations()
        .forAccount(depositorAccount)
        .cursor(pagingToken)
    const processLogFn = (op) => {
        if (op.type !== 'account_merge') {
            return null
        }
        if (op.account !== holdingAccount) {
            return null
        }
        const {transaction_hash: txHash} = op
        return {txHash}
    }
    return await _executeStellarFilter({filter, wait, processLogFn})
}

async function genStellarClaimTx({preimage, depositorAccount, holdingAccount}) {
    const holding = await stellar.loadAccount(holdingAccount)
    const {bidPrice} = await getAssetPrices()
    const depositorBalance = await loadXethBalance({publicKey: depositorAccount})
    let newDepositorLimit = depositorBalance.limit
    let holdingBalance = await loadXethBalance({account: holding})
    if (depositorBalance.limit.lt(depositorBalance.balance.plus(holdingBalance.balance))) {
        newDepositorLimit = newDepositorLimit.plus(holdingBalance.balance)
    }
    const xlmAmount = holdingBalance.balance.times(bidPrice).times(0.99)
    const claimTx = new Stellar.TransactionBuilder(holding)
        .addOperation(Stellar.Operation.changeTrust({
            asset: XETH,
            limit: newDepositorLimit.toFixed(7, BigNumber.ROUND_UP),
            source: depositorAccount,
        }))
        .addOperation(Stellar.Operation.payment({
            asset: XETH,
            amount: holdingBalance.balance.toFixed(7),
            destination: depositorAccount,
            source: holdingAccount,
        }))
        .addOperation(Stellar.Operation.changeTrust({
            asset: XETH,
            limit: '0',
            source: holdingAccount,
        }))
        .addOperation(Stellar.Operation.accountMerge({
            destination: depositorAccount,
            source: holdingAccount,
        }))
        .addOperation(Stellar.Operation.pathPayment({
            sendAsset: XETH,
            sendMax: holdingBalance.balance.plus(depositorBalance.balance).toFixed(7),
            destAsset: Stellar.Asset.native(),
            destAmount: xlmAmount.toFixed(7),
            destination: depositorAccount,
            source: depositorAccount,
        }))
        .build()
    claimTx.signHashX(preimage)
    return {claimTx}
}

export default {
    swapSizes,
    makeHashlock,
    makeHoldingKeys,
    getAssetPrices,
    genStellarRefundTx,
    verifyStellarRefundTx,
    genStellarHoldingTx,
    findStellarHoldingTx,
    prepareSwapParams,
    findPrepareSwap,
    fulfillSwapParams,
    findFulfillSwap,
    findStellarClaimTx,
    genStellarClaimTx,
}
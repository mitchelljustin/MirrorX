import Crypto from 'crypto'
import BigNumber from 'bignumber.js'

import {stellar, Stellar} from "../stellar";
import KEYS from '../../config/keys'
import EthSwapContract from '../ethSwapContract'

const SWAP_ACT_NUM_ENTRIES = 5
const HOLDING_ACCOUNT_BASE_RESERVE = (1.0 + 0.5 * SWAP_ACT_NUM_ENTRIES).toFixed(7)

const WITHDRAW_REFUND_DELAY = 48 * 60 * 60

const SWAP_CONTRACT_TIMELIMIT = 24 * 60 * 60

const XETH = new Stellar.Asset('XETH', KEYS.stellar.issuer.publicKey)

function log() {
    console.log(new Date().toISOString(), ...arguments)
}

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

async function genRefundTx({
                               hashlock,
                               holdingAccount,
                               depositorAccount,
                               withdrawerAccount,
                           }) {
    const withdrawer = await stellar.loadAccount(withdrawerAccount)
    const minTime = new Date().getTime() + WITHDRAW_REFUND_DELAY
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

async function genStellarHoldingTx({
                                       hashlock,
                                       swapSize,
                                       holdingAccount,
                                       depositorAccount,
                                       withdrawerAccount,
                                   }) {
    const withdrawer = await stellar.loadAccount(withdrawerAccount)

    const holdingTx = new Stellar.TransactionBuilder(withdrawer)
        .addOperation(Stellar.Operation.createAccount({
            destination: holdingAccount,
            startingBalance: HOLDING_ACCOUNT_BASE_RESERVE,
            source: withdrawerAccount,
        }))
        .addOperation(Stellar.Operation.changeTrust({
            asset: XETH,
            limit: swapSize.toString(),
            source: holdingAccount,
        }))
        .addOperation(Stellar.Operation.payment({
            destination: holdingAccount,
            asset: XETH,
            amount: swapSize.toString(),
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
                }
            })
        } else {
            try {
                const filterResult = await filter.call();
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
    const processLogFn = (tx) => processLockFundsTx({tx, swapSize, holdingAccount, depositorAccount})
    return await _executeStellarFilter({filter, wait, processLogFn})
}

async function processLockFundsTx({tx, swapSize, holdingAccount, depositorAccount}) {
    const operations = (await tx.operations())._embedded.records
    let createHoldingAcct, trustAsset, payAsset, addFulfiller, addHashlock, adjustSignerWeights
    const checks = [
        () => {
            if (operations.length !== 6) {
                return false
            }
            [
                createHoldingAcct,
                trustAsset,
                payAsset,
                addFulfiller,
                addHashlock,
                adjustSignerWeights,
            ] = operations
            return true
        },
        () => createHoldingAcct.type === 'create_account',
        () => createHoldingAcct.funder === tx.source_account,
        () => createHoldingAcct.account === holdingAccount,
        () => trustAsset.type === 'change_trust',
        () => trustAsset.asset_code === XETH.getCode(),
        () => trustAsset.asset_issuer === XETH.getIssuer(),
        () => trustAsset.source_account === holdingAccount,
        () => payAsset.type === 'payment',
        () => BigNumber(payAsset.amount).eq(swapSize),
        () => payAsset.asset_code === XETH.getCode(),
        () => payAsset.asset_issuer === XETH.getIssuer(),
        () => payAsset.from === tx.source_account,
        () => payAsset.to === holdingAccount,
        () => addFulfiller.type === 'set_options',
        () => addFulfiller.signer_key === depositorAccount,
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
            return null
        }
    }
    const hashlock = Stellar.StrKey.decodeSha256Hash(addHashlock.signer_key)
    return {hashlock}
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
        }
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
    const depositor = await stellar.loadAccount(depositorAccount)
    const holding = await stellar.loadAccount(holdingAccount)

    let xethBalance = null
    for (const bal of holding.balances) {
        if (bal.asset_type === 'native') {
            continue
        }
        if (bal.asset_code === XETH.getCode() && bal.asset_issuer === XETH.getIssuer()) {
            xethBalance = bal.balance
            break
        }
    }
    const claimTx = new Stellar.TransactionBuilder(depositor)
        .addOperation(Stellar.Operation.payment({
            asset: XETH,
            amount: xethBalance,
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
        .build()
    claimTx.signHashX(preimage)
    return {claimTx}
}

const swapSizes = [
    '0.01',
    '0.1',
]

export default {
    swapSizes,
    makeHashlock,
    makeHoldingKeys,
    genStellarHoldingTx,
    findStellarHoldingTx,
    prepareSwapParams,
    findPrepareSwap,
    fulfillSwapParams,
    findFulfillSwap,
    findStellarClaimTx,
    genStellarClaimTx,
}
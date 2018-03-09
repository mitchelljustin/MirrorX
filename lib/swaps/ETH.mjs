import Crypto from 'crypto'
import BigNumber from 'bignumber.js'

import {stellar, Stellar} from '../stellar'
import EthSwapContract from '../ethSwapContract'

const WITHDRAW_REFUND_DELAY = 60 * 60

const SWAP_CONTRACT_TIMELIMIT = 30 * 60

export function makeHashlock() {
    const preimage = Crypto.randomBytes(32)
    const h = Crypto.createHash('sha256')
    h.update(preimage)
    const hashlock = h.digest()
    return {preimage, hashlock}
}

export function makeHoldingKeys() {
    const holdingKeys = Stellar.Keypair.random()
    return {holdingKeys}
}

export function verifyStellarRefundTx({hash, xdr}) {
    const tx = new Stellar.Transaction(xdr)
    if (tx.hash().toString('hex') !== hash) {
        return null
    }
    const {timeBounds: {minTime}} = tx
    const minTimeSecs = parseInt(minTime)
    const secsUntilExpiry = minTimeSecs - Math.round(new Date().getTime() / 1000)
    // Grace period
    if (secsUntilExpiry <= (WITHDRAW_REFUND_DELAY * (3 / 4))) {
        return null
    }
    return tx
}

export async function genStellarCommitmentTxs({
                                                  hashlock,
                                                  swapSize,
                                                  holdingAccount,
                                                  depositorAccount,
                                                  withdrawerAccount,
                                              }) {
    let withdrawer = await stellar.loadAccount(withdrawerAccount)

    withdrawer.incrementSequenceNumber()
    const minTime = Math.round(new Date().getTime() / 1000) + WITHDRAW_REFUND_DELAY
    const refundTx = new Stellar.TransactionBuilder(withdrawer, {
        timebounds: {
            minTime,
            maxTime: 0,
        },
    })
        .addOperation(Stellar.Operation.accountMerge({
            destination: withdrawerAccount,
            source: holdingAccount,
        }))
        .build()

    withdrawer = await stellar.loadAccount(withdrawerAccount)
    const holdingTx = new Stellar.TransactionBuilder(withdrawer)
        .addOperation(Stellar.Operation.createAccount({
            destination: holdingAccount,
            startingBalance: swapSize,
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

    return {refundTx, holdingTx}
}

async function genPastLedgerPagingToken({delta}) {
    const latestLedger = await stellar.ledgers().limit(1).order('desc').call()
    const {sequence} = latestLedger.records[0]
    const startSequence = sequence - delta
    const {paging_token: pagingToken} = await stellar.ledgers().ledger(startSequence).call()
    return {pagingToken}
}

async function _executeStellarFilter({filter, processLogFn, wait}) {
    return new Promise(async(resolve, reject) => {
        if (wait) {
            const close = filter.stream({
                onmessage: async(item) => {
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

export async function findStellarHoldingTx({swapSize, withdrawerAccount, holdingAccount, depositorAccount, wait}) {
    const {pagingToken} = await genPastLedgerPagingToken({delta: 1200})
    const filter = stellar
        .transactions()
        .forAccount(withdrawerAccount)
        .cursor(pagingToken)
    const processLogFn =
        (tx) => processHoldingTx({tx, swapSize, holdingAccount, withdrawerAccount, depositorAccount})
    return _executeStellarFilter({filter, wait, processLogFn})
}

export async function processHoldingTx({
                                           tx,
                                           swapSize,
                                           holdingAccount,
                                           withdrawerAccount,
                                           depositorAccount,
                                       }) {
    const operations = (await tx.operations())._embedded.records
    let fundHolding, addFulfiller, addHashlock,
        addRefundTx, adjustSignerWeights

    const checks = [
        () => {
            if (operations.length === 5) {
                [
                    fundHolding,
                    addFulfiller,
                    addHashlock,
                    addRefundTx,
                    adjustSignerWeights,
                ] = operations
                return true
            }
            return false
        },
        () => fundHolding.funder === tx.source_account,
        () => fundHolding.account === holdingAccount,
        () => BigNumber(fundHolding.starting_balance).eq(swapSize),
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
            console.log(`Tx ${tx.id} not a holding TX: failed at check ${i}`)
            return null
        }
    }
    const hashlock = Stellar.StrKey.decodeSha256Hash(addHashlock.signer_key)
    const refundTxHash = Stellar.StrKey.decodePreAuthTx(addRefundTx.signer_key)
    const txId = tx.id
    console.log(`Found holding tx ${txId}, hashlock=${hashlock.toString('hex')}, refundTx=${refundTxHash.toString('hex')}`)
    return {refundTxHash, hashlock, txId}
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

export async function findPrepareSwap({
                                          swapSize,
                                          hashlock,
                                          withdrawerEthAddress,
                                          xlmPerUnit,
                                          wait,
                                      }) {
    hashlock = `0x${hashlock.toString('hex')}`
    const minWeiAmount = BigNumber(swapSize).div(xlmPerUnit).times(0.99).times(1e18)
    const recipient = withdrawerEthAddress.toLowerCase()

    const contract = await EthSwapContract.deployed()
    const filter = contract.SwapPrepared({hashlock}, {fromBlock: 0})
    const processLogFn = ({eventLog}) => {
        const {args} = eventLog
        if (args.recipient !== recipient) {
            return null
        }
        if (!args.value.gte(minWeiAmount)) {
            return null
        }
        return eventLog
    }
    return _executeEthFilter({filter, wait, processLogFn})
}

export function prepareSwapParams({
                                      hashlock,
                                      swapSize,
                                      depositorEthAddress,
                                      withdrawerEthAddress,
                                      xlmPerUnit,
                                  }) {
    const timelimit = SWAP_CONTRACT_TIMELIMIT
    const wei = BigNumber(swapSize).div(xlmPerUnit).times(1e18).toString()
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

export function fulfillSwapParams({
                                      preimage,
                                      withdrawerEthAddress,
                                  }) {
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

export function refundSwapParams({
                                     hashlock,
                                     depositorEthAddress,
                                 }) {
    const funcName = 'refundSwap'
    const preimage0x = `0x${hashlock.toString('hex')}`
    const params = [
        preimage0x,
        {
            from: depositorEthAddress,
            gas: '60000',
        },
    ]
    return {funcName, params}
}

export async function findFulfillSwap({hashlock, wait}) {
    hashlock = `0x${hashlock.toString('hex')}`

    const contract = await EthSwapContract.deployed()
    const filter = contract.SwapFulfilled({hashlock}, {
        fromBlock: 0,
    })
    const processLogFn = ({eventLog}) => {
        return eventLog
    }
    return _executeEthFilter({filter, processLogFn, wait})
}

export async function findRefundSwap({hashlock, wait}) {
    hashlock = `0x${hashlock.toString('hex')}`

    const contract = await EthSwapContract.deployed()
    const filter = contract.SwapRefunded({hashlock}, {
        fromBlock: 0,
    })
    const processLogFn = (eventLog) => eventLog
    return _executeEthFilter({filter, processLogFn, wait})
}

export async function findStellarClaimTx({depositorAccount, holdingAccount, wait}) {
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
        const {transaction_hash: txId} = op
        return {txId}
    }
    return _executeStellarFilter({filter, wait, processLogFn})
}

export async function genStellarClaimTx({preimage, depositorAccount, holdingAccount}) {
    const holding = await stellar.loadAccount(holdingAccount)
    const claimTx = new Stellar.TransactionBuilder(holding)
        .addOperation(Stellar.Operation.accountMerge({
            destination: depositorAccount,
            source: holdingAccount,
        }))
        .build()
    claimTx.signHashX(preimage)
    return {claimTx}
}

export async function stellarAccountExists(account) {
    try {
        await stellar.loadAccount(account)
    } catch (e) {
        if (e.name !== 'NotFoundError') {
            throw e
        }
        return false
    }
    return true
}

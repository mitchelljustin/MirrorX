"use strict";
import Stellar from 'stellar-sdk'
import Crypto from 'crypto'
import Zcash from 'zcash-bitcore-lib'
import Bs58check from 'bs58check'
import Axios from 'axios'

const myKeys = Stellar.Keypair.fromSecret('SAQKSXX2HVZP6F7IPXPE6ROLEVQTO4KHQKR77HNZDRMFCWMCXJPLVAJY')
const bridgeKeys = Stellar.Keypair.fromSecret('SDYE34F3QVIZOJWMG74HWOBAPSGR6HA336TFR2YMKZZQXHC7PSCSIUOP')
const issuingKeys = Stellar.Keypair.fromSecret('SB6BVWXETQXAYHBUIMKQ76KRUBKI4HOGLYOR3YQQVOUNCRYTUCFRX27Q')
const zcashCoinbaseAddress = 'tmFm83dWynkho6CMfTi3TBoumeN5PVo5nxq'
const zcashCoinbasePrivkey = 'cQGn9y52mpFKbjy38cLuhixaSXmSRoYaRmnmU7Fk7hF4R1531v7w'
const zcashTargetAddress = 'tmSxtXb898RneTt2JFpauaj1RSPf4yaSMsh'
const zcashTimelockDuration = 24 * 60 * 60

const ZEC = new Stellar.Asset('ZEC', issuingKeys.publicKey())


function decodeZcashAddress(address) {
    let payload = Bs58check.decode(address)
    let version = payload.readUInt16BE(0)
    let data = payload.slice(2)

    return {data, version}
}


// Hashed Time-Locked Contract (HTLC)
// OP_IF
//     [HASHOP] <digest> OP_EQUALVERIFY OP_DUP OP_HASH160 <seller pubkey hash>
// OP_ELSE
// <num> [TIMEOUTOP] OP_DROP OP_DUP OP_HASH160 <buyer pubkey hash>
// OP_ENDIF
// OP_EQUALVERIFY
// OP_CHECKSIG
// CScript([OP_IF, OP_SHA256, hash_of_secret, OP_EQUALVERIFY,OP_DUP, OP_HASH160,
//     redeemerAddr, OP_ELSE, redeemblocknum, OP_CHECKLOCKTIMEVERIFY, OP_DROP, OP_DUP, OP_HASH160,
//     funderAddr, OP_ENDIF,OP_EQUALVERIFY, OP_CHECKSIG])
function zcashGenAtomicSwapScript({targetAddress, returnAddress, hashlock}) {
    let {data: targetHash} = decodeZcashAddress(targetAddress)
    let {data: returnHash} = decodeZcashAddress(returnAddress)
    let hashlockBytes = new Buffer(hashlock, 'hex');
    let timelockDuration = new Buffer(4)
    timelockDuration.writeUInt32LE(188860 + 100)
    return Zcash.Script()
        .add('OP_IF')
        .add('OP_SHA256')
        .add(hashlockBytes)
        .add('OP_EQUALVERIFY')
        .add('OP_DUP')
        .add('OP_HASH160')
        .add(targetHash)
        .add('OP_ELSE')
        .add(timelockDuration)
        .add('OP_CHECKLOCKTIMEVERIFY')
        .add('OP_DROP')
        .add('OP_DUP')
        .add('OP_HASH160')
        .add(returnHash)
        .add('OP_ENDIF')
        .add('OP_EQUALVERIFY')
        .add('OP_CHECKSIG')
}

function connectStellar() {
    Stellar.Network.useTestNetwork()

    return new Stellar.Server('https://horizon-testnet.stellar.org')
}

function connectZcash() {
    return {
        call(method, params) {
            return Axios({
                url: 'http://localhost:18232',
                method: 'POST',
                auth: {
                    username: 'zcash',
                    password: 'atomicswap',
                },
                data: {
                    jsonrpc: '1.0',
                    id: `swap`,
                    method,
                    params
                },
            })
                .catch((e) => {
                throw new Error(`RPC error: ${JSON.stringify(e.response.data.error)}`)
            })
        .then((response) => {
                if (response.data.error) {
                throw new Error(`RPC error: ${JSON.stringify(e.response.data.error)}`)
            }
            return response.data.result
        })
        }
    }
}


async function stellarIssueZec({zecAmount}) {
    const stellar = connectStellar()
    let issueAccount = await stellar.loadAccount(issuingKeys.publicKey())
    let bridgeAccount = await stellar.loadAccount(bridgeKeys.publicKey())
    let bridgeTx = new Stellar.TransactionBuilder(bridgeAccount)
        .addOperation(Stellar.Operation.changeTrust({
            asset: ZEC,
            limit: '1000.0',
        }))
        .build()
    bridgeTx.sign(bridgeKeys)
    await stellar.submitTransaction(bridgeTx)
    let issueTx = new Stellar.TransactionBuilder(issueAccount)
        .addOperation(Stellar.Operation.payment({
            asset: ZEC,
            destination: bridgeKeys.publicKey(),
            amount: zecAmount,
        }))
        .build()
    issueTx.sign(issuingKeys)
    await stellar.submitTransaction(issueTx)
    console.log(`Issued ${zecAmount} ZEC`)
}

async function stellarFundZec({zecAmount}) {
    const stellar = connectStellar()
    let bridgeAccount = await stellar.loadAccount(bridgeKeys.publicKey())
    let tx = new Stellar.TransactionBuilder(bridgeAccount)
        .addOperation(Stellar.Operation.changeTrust({
            asset: ZEC,
            limit: '1000.0',
            source: myKeys.publicKey(),
        }))
        .addOperation(Stellar.Operation.payment({
            asset: ZEC,
            destination: myKeys.publicKey(),
            amount: zecAmount,
        }))
        .build()
    tx.sign(bridgeKeys)
    tx.sign(myKeys)
    await stellar.submitTransaction(tx)
    console.log(`Funded my account with ${zecAmount} ZEC`)
}

async function stellarInitSwap({zecAmount}) {
    const stellar = connectStellar()
    // TODO: make random
    let swapTokenBytes = new Buffer('e9dbc14b8bca127dbff2ae99445a58d4c5c2bf5d792c325e30830e3f77d7dfb6', 'hex')
    let swapToken = swapTokenBytes.toString('hex')
    console.log(`Swap token: ${swapToken}`)
    let h = Crypto.createHash('sha256')
    h.update(swapTokenBytes)
    let hashlockBytes = h.digest()
    let hashlock = hashlockBytes.toString('hex')
    console.log(`Hashlock: ${hashlock}`)
    let swapKeys = Stellar.Keypair.random()
    let myAccount = await stellar.loadAccount(myKeys.publicKey())
    let tx = new Stellar.TransactionBuilder(myAccount)
    // Create swap account
        .addOperation(Stellar.Operation.createAccount({
            destination: swapKeys.publicKey(),
            startingBalance: '2.5',
        }))
        // ZEC trustline for swap account
        .addOperation(Stellar.Operation.changeTrust({
            asset: ZEC,
            limit: zecAmount,
            source: swapKeys.publicKey(),
        }))
        // Fund swap account with ZEC
        .addOperation(Stellar.Operation.payment({
            asset: ZEC,
            destination: swapKeys.publicKey(),
            amount: zecAmount,
        }))
        // Add hashlock
        .addOperation(Stellar.Operation.setOptions({
            signer: {
                sha256Hash: hashlock,
                weight: 1,
            },
            source: swapKeys.publicKey(),
        }))
        // Add Bridge as signer and de-authorize swap account
        .addOperation(Stellar.Operation.setOptions({
            signer: {
                ed25519PublicKey: bridgeKeys.publicKey(),
                weight: 1,
            },
            lowThreshold: 2,
            medThreshold: 2,
            highThreshold: 2,
            masterWeight: 0,
            source: swapKeys.publicKey(),
        }))
        .build()
    tx.sign(swapKeys)
    tx.sign(myKeys)
    await stellar.submitTransaction(tx)
    console.log(`Sent ${zecAmount} ZEC to account ${swapKeys.publicKey()} with hashlock ${hashlock}`)
    let swapAccount = swapKeys.publicKey()
    return {swapAccount, swapToken, hashlock}
}

async function zcashCreateSwapTx({zecAmount, hashlock, targetAddress, returnAddress}) {
    const zcash = connectZcash()

    let script = zcashGenAtomicSwapScript({
        targetAddress,
        returnAddress,
        hashlock,
    }).toBuffer()

    let privateKey = new Zcash.PrivateKey(zcashCoinbasePrivkey);

    let tx = new Zcash.Transaction()
    let satoshis = Math.floor(parseFloat(zecAmount) * 1e8)

    tx.addOutput(new Zcash.Transaction.Output({
        satoshis,
        script,
    }))
    // tx.to(targetAddress, satoshis)

    let decoded = await zcash.call('decodescript', [script.toString('hex')])
    console.log(decoded.asm)

    let funded = await zcash.call('fundrawtransaction', [tx.toString()])
    let signed = await zcash.call('signrawtransaction', [funded.hex])
    let zcashTx = await zcash.call('sendrawtransaction', [signed.hex])
    return zcashTx
}

async function run() {
    let zecAmount = '0.1'
    try {
        // await stellarIssueZec({zecAmount})
        // await stellarFundZec({zecAmount})
        // let {swapAccount, swapToken, hashlock} = await stellarInitSwap({zecAmount})
        let hashlock = 'fa3c80ca9691026eabff0f450df13a0280e0685617f39e445a526d064a032e60'
        let zcashTx = await zcashCreateSwapTx({
            zecAmount,
            hashlock,
            targetAddress: zcashTargetAddress,
            returnAddress: zcashCoinbaseAddress,
        })
        console.log(zcashTx)
    } catch (e) {
        if (e instanceof Error) {
            console.error(e.message, e.stack)
        } else {
            console.error(JSON.stringify(e, null, 2))
        }
    }
}

run()
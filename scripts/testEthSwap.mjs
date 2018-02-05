"use strict";

import Stellar from "stellar-sdk"
import Keys from './keys'
import Crypto from 'crypto'
import XMSwap from './xmSwap'

const XETH = new Stellar.Asset('XETH', Keys.str.issuer.publicKey())
const SWAP_ACT_NUM_ENTRIES = 5
const SWAP_ACT_BASE_RESERVE = (1.0 + 0.5 * SWAP_ACT_NUM_ENTRIES).toFixed(7)

const SWAP_ACT_REFUND_DELAY = 48 * 60 * 60

const SWAP_CONTRACT_TIMELIMIT = 24 * 60 * 60

class Swapper {
    constructor({keys}) {
        Stellar.Network.useTestNetwork()
        this.stellar = new Stellar.Server('https://horizon-testnet.stellar.org')
        this.keys = keys
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

    async genStellarSwapRefundTx({swapKeys}) {
        const lastLedger = await this.stellar.ledgers().order('desc').limit(1).call()
        const timestamp = new Date(lastLedger.records[0].closed_at).getTime()
        const alice = await this.stellar.loadAccount(this.keys.str.alice.publicKey())
        const minTime = timestamp + SWAP_ACT_REFUND_DELAY;
        const swapRefundTxOptions = {
            timebounds: {
                maxTime: minTime + 365 * 24 * 60 * 60,
                minTime,
            }
        }
        const swapRefundTx = new Stellar.TransactionBuilder(alice, swapRefundTxOptions)
            .addOperation(Stellar.Operation.accountMerge({
                destination: alice.account_id,
            }))
            .build()
        return {swapRefundTx}
    }

    async prepareSwapAccount({hashlock, swapSize, swapKeys, swapRefundTx}) {
        const alice = await this.stellar.loadAccount(this.keys.str.alice.publicKey())
        const swapActId = swapKeys.publicKey()
        const bobActId = this.keys.str.bob.publicKey()
        const aliceActId = this.keys.str.alice.publicKey()

        const createSwapTx = new Stellar.TransactionBuilder(alice)
            .addOperation(Stellar.Operation.createAccount({
                destination: swapActId,
                startingBalance: SWAP_ACT_BASE_RESERVE,
            }))
            .build()
        createSwapTx.sign(this.keys.str.alice)
        console.log(`Submitting create swap account tx: ${createSwapTx.hash().toString('hex')}`)
        await this.stellar.submitTransaction(createSwapTx)
        const swap = await this.stellar.loadAccount(swapActId)

        const lockFundsTx = new Stellar.TransactionBuilder(swap)
            .addOperation(Stellar.Operation.changeTrust({
                asset: XETH,
                limit: swapSize,
                source: swapActId,
            }))
            .addOperation(Stellar.Operation.payment({
                destination: swapActId,
                asset: XETH,
                amount: swapSize,
                source: aliceActId,
            }))
            .addOperation(Stellar.Operation.setOptions({
                signer: {
                    preAuthTx: swapRefundTx.hash(),
                    weight: 2,
                },
            }))
            .addOperation(Stellar.Operation.setOptions({
                signer: {
                    ed25519PublicKey: bobActId,
                    weight: 1,
                },
            }))
            .addOperation(Stellar.Operation.setOptions({
                signer: {
                    sha256Hash: hashlock,
                    weight: 1,
                },
            }))
            .addOperation(Stellar.Operation.setOptions({
                masterWeight: 0,
                lowThreshold: 2,
                medThreshold: 2,
                highThreshold: 2,
            }))
            .build()
        lockFundsTx.sign(swapKeys)
        lockFundsTx.sign(this.keys.str.alice)
        console.log(`Submitting lock funds tx: ${lockFundsTx.hash().toString('hex')}`)
        await this.stellar.submitTransaction(lockFundsTx)
        return {createSwapTx, lockFundsTx}
    }

    async genReserveRefundTx({createSwapTx, hashlock}) {
        // TODO: complete
        return {reserveRefundTx: null}
    }

    // function XMirrorSwap(bytes32 hashlock, uint256 timelimit, address recipient) public payable
    async prepareEthSwap({hashlock, swapSize}) {
        const recipient = this.keys.eth.alice.address
        const sender = this.keys.eth.bob.address
        const timelimit = SWAP_CONTRACT_TIMELIMIT
        const contract = await XMSwap.deployed()
        const wei = parseFloat(swapSize) * 1e18;
        const gasEstimate = await contract.prepareSwap.estimateGas(
            recipient,
            `0x${hashlock.toString('hex')}`,
            timelimit,
            {
                from: sender,
                value: wei,
            }
        )
        const res = await contract.prepareSwap(
            recipient,
            `0x${hashlock.toString('hex')}`,
            timelimit,
            {
                from: sender,
                value: wei,
                gas: gasEstimate,
            }
        )
        console.log(`Successfully prepared swap on Ethereum. TX: ${res.tx}`)
    }

    async executeSwap({preimage, hashlock, swapKeys, swapSize}) {
        const preimageHex = preimage.toString('hex');

        // Bob claims his XETH
        const swapActId = swapKeys.publicKey()
        const bobActId = this.keys.str.bob.publicKey()

        const bob = await this.stellar.loadAccount(bobActId)
        const claimTx = new Stellar.TransactionBuilder(bob)
            .addOperation(Stellar.Operation.changeTrust({
                asset: XETH,
                limit: '4000',
            }))
            .addOperation(Stellar.Operation.payment({
                asset: XETH,
                source: swapActId,
                destination: bobActId,
                amount: swapSize,
            }))
            .addOperation(Stellar.Operation.changeTrust({
                asset: XETH,
                source: swapActId,
                limit: '0',
            }))
            .addOperation(Stellar.Operation.accountMerge({
                destination: bobActId,
                source: swapActId,
            }))
            .build()
        claimTx.sign(this.keys.str.bob)
        claimTx.signHashX(preimage)
        let xethRes = await this.stellar.submitTransaction(claimTx)
        console.log(`Bob claimed his ${swapSize} XETH (Stellar) on account ${bobActId}, preimage now public knowledge.`)
        // NOW PREIMAGE IS PUBLIC KNOWLEDGE
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

    async doSwap({swapSize}) {
        const {preimage, hashlock} = this.makeHashlock()
        console.log(`Hashlock: ${hashlock.toString('hex')}`)
        console.log(`Preimage: ${preimage.toString('hex')}`)
        // Stellar setup
        const {swapKeys} = this.makeSwapKeys()
        console.log(`Stellar Swap account: ${swapKeys.publicKey()}`)
        const {swapRefundTx} = await this.genStellarSwapRefundTx({swapKeys})
        console.log(`Stellar Swap refund tx hash: ${swapRefundTx.hash().toString('hex')}`)
        // not shown: publish swapRefundTx to Bob
        const {createSwapTx, lockFundsTx} = await this.prepareSwapAccount({hashlock, swapSize, swapKeys, swapRefundTx})
        const {reserveRefundTx} = await this.genReserveRefundTx({createSwapTx, hashlock})

        // Ethereum setup
        await this.prepareEthSwap({hashlock, swapSize})

        // Execute swap
        let {xethRes, ethRes} = await this.executeSwap({preimage, hashlock, swapKeys, swapSize})
        console.log(`Success!\nStellar result:${JSON.stringify(xethRes, null, 2)}\nEthereum result:${JSON.stringify(ethRes, null, 2)}`)
    }

}

async function run() {
    try {
        const swapper = new Swapper({
            keys: Keys,
        })
        await swapper.doSwap({swapSize: '0.1'})
    } catch (e) {
        console.error(e.message, e.stack)
        console.error(JSON.stringify(e, null, 2))
    }
}

run()
#!/usr/bin/env node --experimental-modules
import {Stellar, stellar} from '../lib/stellar.mjs'
import Axios from 'axios'
import FS from 'fs'

async function run() {
    const keys = {
        stellar: {},
    }

    await Promise.all([
        createAccount('issuer'),
        createAccount('alice'),
        createAccount('bob'),
    ])
    await issueXeth()

    FS.writeFileSync('./config/keys.json', JSON.stringify(keys, null, 2))

    return keys

    async function createAccount(accountName) {
        const keypair = Stellar.Keypair.random()
        const publicKey = keypair.publicKey()
        console.log(`Created keypair for ${accountName}: ${publicKey}`)
        const response = await Axios.get(`https://horizon-testnet.stellar.org/friendbot?addr=${publicKey}`)
        if (response.status !== 200) {
            throw response
        }
        console.log(`Funded ${accountName}`)
        const secret = keypair.secret()
        keys.stellar[accountName] = {
            publicKey, secret,
        }
    }

    async function issueXeth() {
        const issuerAccount = keys.stellar.issuer.publicKey
        const issuer = await stellar.loadAccount(issuerAccount)
        const XETH = new Stellar.Asset('XETH', issuerAccount)

        const tx = new Stellar.TransactionBuilder(issuer)
            .addOperation(Stellar.Operation.changeTrust({
                asset: XETH,
                limit: '100.0',
                source: keys.stellar.alice.publicKey,
            }))
            .addOperation(Stellar.Operation.changeTrust({
                asset: XETH,
                limit: '100.0',
                source: keys.stellar.bob.publicKey,
            }))
            .addOperation(Stellar.Operation.payment({
                destination: keys.stellar.alice.publicKey,
                asset: XETH,
                amount: '100.0',
                source: issuerAccount,
            }))
            .build()
        for (const account of Object.values(keys.stellar)) {
            const keypair = Stellar.Keypair.fromSecret(account.secret)
            tx.sign(keypair)
        }
        await stellar.submitTransaction(tx)
        console.log('Funded Alice\'s account with 100 XETH')
    }
}

run()
    .then(() => {
        console.log('Done! Keys saved in config/keys.json')
    })
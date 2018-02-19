#!/usr/bin/env node --experimental-modules
"use strict"

import Argparse from 'argparse'
import {stellar, Stellar} from '../lib/stellar'
import KEYS from '../config/keys'

const parser = new Argparse.ArgumentParser()

parser.addArgument(['amount'])
parser.addArgument(['xAsset'])
parser.addArgument(['--destination'])

const args = parser.parseArgs()

run(args)
    .then(() => {
        console.log('Success')
    })
    .catch((e) => {
        console.error('ERROR')
        console.error(e)
        process.exit(1)
    })

async function run({amount, xAsset, destination}) {
    const issuerKeys = Stellar.Keypair.fromSecret(KEYS.stellar.issuer.secret)

    const asset = new Stellar.Asset(xAsset, issuerKeys.publicKey())
    const issuer = await stellar.loadAccount(issuerKeys.publicKey())

    console.log(`Issuing ${args.swapSize} ${args.xAsset} to ${destination}`)
    let tx = new Stellar.TransactionBuilder(issuer)
        .addOperation(Stellar.Operation.payment({
            amount,
            asset,
            destination,
        }))
        .build()
    tx.sign(issuerKeys)
    await stellar.submitTransaction(tx)
    console.log("Issue success")

    const destAcct = await stellar.loadAccount(destination)
    let xAssetBalance = null
    destAcct.balances.forEach(balance => {
        if (balance.asset_type === 'native') {
            return
        }
        if (balance.asset_code === xAsset) {
            xAssetBalance = balance.balance
        }
    })
    console.log(`Destination account has ${xAssetBalance ? xAssetBalance : 'no'} ${xAsset}`)
}


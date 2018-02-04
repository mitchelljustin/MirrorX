"use strict"

import Argparse from 'argparse'
import Stellar from 'stellar-sdk'
import Keys from './keys'

const parser = new Argparse.ArgumentParser()

parser.addArgument(['amount'])
parser.addArgument(['xAsset'])

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

async function run({amount, xAsset}) {
    Stellar.Network.useTestNetwork()

    const asset = new Stellar.Asset(xAsset, Keys.str.issuer.publicKey())
    const stellar = new Stellar.Server('https://horizon-testnet.stellar.org')

    const issuer = await stellar.loadAccount(Keys.str.issuer.publicKey())
    console.log(`Issuing ${args.amount} ${args.xAsset} to Alice`)
    let tx = new Stellar.TransactionBuilder(issuer)
        .addOperation(Stellar.Operation.changeTrust({
            limit: '4294967296',
            source: Keys.str.alice.publicKey(),
            asset,
        }))
        .addOperation(Stellar.Operation.payment({
            destination: Keys.str.alice.publicKey(),
            source: Keys.str.issuer.publicKey(),
            amount, asset
        }))
        .build()
    tx.sign(Keys.str.issuer)
    tx.sign(Keys.str.alice)
    await stellar.submitTransaction(tx)
    console.log("Issue success")

    const alice = await stellar.loadAccount(Keys.str.alice.publicKey())
    let xAssetBalance = null
    alice.balances.forEach(balance => {
        if (balance.asset_type === 'native') {
            return
        }
        if (balance.asset_code === xAsset) {
            xAssetBalance = balance.balance
        }
    })
    console.log(`Alice's account has ${xAssetBalance ? xAssetBalance : 'no'} ${xAsset}`)
}


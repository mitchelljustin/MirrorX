#!/usr/bin/env node --experimental-modules
"use strict";

import Argparse from "argparse"
import SupportedSwaps from '../lib/swapSpecs'

const parser = new Argparse.ArgumentParser()

parser.addArgument(['amount'])
parser.addArgument(['asset'])
parser.addArgument(['--stellar-preparer', '-sp'])
parser.addArgument(['--stellar-fulfiller', '-sf'])
parser.addArgument(['--outside-preparer', '-op'])
parser.addArgument(['--outside-fulfiller', '-of'])

const args = parser.parseArgs()

const keys = ['stellar_fulfiller', 'stellar_preparer', 'outside_preparer', 'outside_fulfiller']
const missing = keys.filter(k => args[k] == null)
if (missing.length > 0) {
    console.error(`Missing options: ${missing}`)
    process.exit(1)
}

const Swap = SupportedSwaps[args.asset];
if (Swap === undefined) {
    console.error(`Swap not supported for asset ${args.asset}`)
    process.exit(1)
}

const {Deposit} = Swap

new Deposit(args)
    .run()
    .then(() => {
        console.log(`Success!`)
        process.exit(0)
    })
    .catch((e) => {
        console.log(`Failed. ${JSON.stringify(e)}`)
        process.exit(1)
    })

#!/usr/bin/env node --experimental-modules
"use strict";

import Argparse from "argparse"
import SupportedSwaps from '../lib/supportedSwaps'

const parser = new Argparse.ArgumentParser()

parser.addArgument(['amount'])
parser.addArgument(['asset'])
parser.addArgument(['--stellar-ful-secret', '-sf'])
parser.addArgument(['--stellar-preparer', '-sp'])
parser.addArgument(['--outside-preparer', '-op'])
parser.addArgument(['--outside-fulfiller', '-of'])

const args = parser.parseArgs()

const keys = ['stellar_ful_secret', 'stellar_preparer', 'outside_preparer', 'outside_fulfiller']
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

const {SwapIn} = Swap

new SwapIn(args)
    .run()
    .then(() => {
        console.log(`Success!`)
    })
    .catch((e) => {
        console.log(`Failed. ${e}`)
    })

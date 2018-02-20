#!/usr/bin/env node
import Argparse from "argparse"

import loadSecrets from "./lib/loadSecrets"
import Anchor from './lib/anchor.mjs'
import {Stellar} from './lib/stellar.mjs'

const parser = new Argparse.ArgumentParser()

parser.addArgument(['assetCode'])
parser.addArgument(['currencyPair'])

const {assetCode, currencyPair} = parser.parseArgs()

loadSecrets()

const keypair = Stellar.Keypair.fromSecret(process.env.DISTRIBUTOR_SECRET)
const asset = new Stellar.Asset(assetCode, process.env.ISSUER)

const anchor = new Anchor({keypair, asset, currencyPair})
anchor.runForever()
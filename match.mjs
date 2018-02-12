#!/usr/local/bin/node --experimental-modules
import Argparse from "argparse"

import MatchingEngine from './lib/api/matchingEngine.mjs'
import connectRedis from './lib/api/createRedisClient.mjs'

const parser = new Argparse.ArgumentParser()

parser.addArgument(['swapSize'])
parser.addArgument(['currency'])

const args = parser.parseArgs()

const {currency, swapSize} = args
const redis = connectRedis()

const engine = new MatchingEngine({currency, redis})
engine.matchForever({swapSize})
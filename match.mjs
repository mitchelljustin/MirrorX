#!/usr/bin/env node
import './lib/loadSecrets'

import MatchingEngine from './lib/api/matchingEngine.mjs'
import {allCurrencies, allSwapSizes} from './lib/swapSpecs.mjs'

for (const currency of allCurrencies) {
    for (const swapSize of allSwapSizes) {
        const engine = new MatchingEngine({currency})
        engine.matchForever({swapSize})
        console.log(`Matching ${currency} for swaps of size ${swapSize} XLM`)
    }
}

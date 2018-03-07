'use strict'

import * as ETH from './swaps/ETH'

export const swapSpecs = {
    ETH,
}

export const allCurrencies = Object.keys(swapSpecs)

export function currencySupported(currency) {
    return swapSpecs[currency] !== undefined
}

export const allSwapSizes = [
    '10',
    '50',
]

export function swapSizeSupported(swapSize) {
    return allSwapSizes.indexOf(swapSize) !== -1
}

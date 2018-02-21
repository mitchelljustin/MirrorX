import SwapSpecs from '../../../lib/swapSpecs.mjs'

async function getAssetPrice({currency, side})
{
  const swapSpec = SwapSpecs[currency]
  if (!swapSpec) {
    throw new Error(`Swap spec not found for '${currency}'`)
  }
  const {bidPrice, askPrice} = await swapSpec.getAssetPrices()
  if (side === 'deposit') {
    return bidPrice
  } else {
    return askPrice
  }
}

export {getAssetPrice}

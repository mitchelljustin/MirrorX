import Axios from 'axios'
import BigNumber from 'bignumber.js'

async function getAssetPrice({currency}) {
  const currencyPair = `XLM${currency}`
  const uri = `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${currencyPair}`
  const {data: {bidPrice, askPrice}} = await Axios.get(uri, {
  })
  const assetPrice = BigNumber(bidPrice).plus(askPrice).div(2).pow(-1)
  return assetPrice
}

export {getAssetPrice}

import Axios from 'axios'
import BigNumber from 'bignumber.js'

export async function loadEthXlmPrice() {
  const {data: {bid, ask}} = await Axios.get(process.env.API_URI + '/prices/XLMETH')
  return BigNumber(bid).plus(ask).div(2).pow(-1)
}

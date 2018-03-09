const STELLAR_BASE_URI = process.env.STELLAR_NETWORK === 'PUBLIC'
  ? 'https://stellar.expert/explorer/public' : 'https://stellar.expert/explorer/testnet'
const ETHEREUM_BASE_URI = process.env.ETHEREUM_NETWORK_ID === 1
  ? 'https://etherscan.io' : 'https://rinkeby.etherscan.io'

export function makeStellarLink({type, id}) {
  return `${STELLAR_BASE_URI}/${type}/${id}`
}

export function makeEthereumLink({type, id}) {
  return `${ETHEREUM_BASE_URI}/${type}/${id}`
}

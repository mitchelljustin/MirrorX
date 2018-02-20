import Web3 from 'web3'

let web3 = null
if (typeof window !== 'undefined' && typeof window.web3 !== 'undefined') {
  console.log('METAMASK DETECTED')
  web3 = new Web3(window.web3.currentProvider)
} else {
  console.log('WARNING: NO METAMASK DETECTED')
  web3 = {}
}

export default web3

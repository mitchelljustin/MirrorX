"use strict";

import TruffleContract from 'truffle-contract'
import Web3 from 'web3'

import SwapContractSource from '../support/truffle/build/contracts/XMSwap'

const SwapContract = TruffleContract(SwapContractSource)
if(typeof window !== 'undefined' && window.web3 !== undefined) {
    console.log("Detected injected web3")
    SwapContract.setProvider(window.web3.currentProvider)
} else {
    SwapContract.setProvider(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
}

//dirty hack for web3@1.0.0 support for localhost testrpc, see https://github.com/trufflesuite/truffle-contract/issues/56#issuecomment-331084530
if (typeof SwapContract.currentProvider.sendAsync !== "function") {
    SwapContract.currentProvider.sendAsync = function() {
        return SwapContract.currentProvider.send.apply(
            SwapContract.currentProvider, arguments
        );
    };
}

export default SwapContract

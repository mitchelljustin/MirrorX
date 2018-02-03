"use strict";

import TruffleContract from 'truffle-contract'
import Web3 from 'web3'

import XMSwapSource from '../support/truffle/build/contracts/XMSwap'

const XMSwap = TruffleContract(XMSwapSource)
XMSwap.setProvider(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))

//dirty hack for web3@1.0.0 support for localhost testrpc, see https://github.com/trufflesuite/truffle-contract/issues/56#issuecomment-331084530
if (typeof XMSwap.currentProvider.sendAsync !== "function") {
    XMSwap.currentProvider.sendAsync = function() {
        return XMSwap.currentProvider.send.apply(
            XMSwap.currentProvider, arguments
        );
    };
}

export default XMSwap

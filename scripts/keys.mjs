"use strict";


import Stellar from "stellar-sdk"
import Config from '../config/config'
import EthUtil from 'ethereumjs-util'

const Keys = {
    str: {},
    eth: {},
}
Object.keys(Config.stellar.keys).forEach(name => {
    Keys.str[name] = Stellar.Keypair.fromSecret(Config.stellar.keys[name])
})
Object.keys(Config.ethereum.keys).forEach(name => {
    const priv = new Buffer(Config.ethereum.keys[name], 'hex')
    Keys.eth[name] = {
        address: '0x' + EthUtil.privateToAddress(priv).toString('hex'),
        priv,
    }
})

export default Keys

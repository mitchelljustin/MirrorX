"use strict";


import Stellar from "stellar-sdk"
import Config from '../config/config'
import EthUtil from 'ethereumjs-util'

const Keys = {}

Keys.str = {}
Object.keys(Config.stellar.keys).forEach(name => {
    Keys.str[name] = Stellar.Keypair.fromSecret(Config.stellar.keys[name])
})

Keys.eth = Object.assign({}, Config.ethereum.keys)

export default Keys

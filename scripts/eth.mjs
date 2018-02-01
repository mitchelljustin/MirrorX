"use strict";
import Web3 from 'web3'
import Config from '../config/config'

const RPC_URI = Config.ethereum.rpcUri

const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URI))

export { web3, Web3 }


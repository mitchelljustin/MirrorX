'use strict'
const merge = require('webpack-merge')
const prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  API_URI: '"http://localhost:9080"',
  HOST: '"0.0.0.0"',
  ETHEREUM_NETWORK_ID: '3', // Rinkeby
  STELLAR_ISSUER: '"GD2F7PSX6TBDTZRBI7TABN3O4OIQWWDEBNSO2R62NFCBK7WC5ECH667L"',
  STELLAR_NETWORK: '"TESTNET"',
  STELLAR_HORIZON_URI: '"https://horizon-testnet.stellar.org"',
})

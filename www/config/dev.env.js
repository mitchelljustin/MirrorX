'use strict'
const merge = require('webpack-merge')
const prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  API_URI: '"http://localhost:9080"',
  HOST: '"0.0.0.0"',
})

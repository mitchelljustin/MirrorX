#!/usr/bin/env node --experimental-modules

import connectRedis from './lib/api/createRedisClient.mjs'
import ApiServer from './lib/api/server.mjs'

const port = process.env.API_PORT || 9080

const redis = connectRedis()
const apiServer = new ApiServer({redis})

apiServer.start({port})
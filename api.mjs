import Server from './lib/api/server'

const apiPort = process.env.API_PORT || 9080
const redisUri = process.env.REDIS_URI || 'redis://localhost:6379'

new Server({redisUri})
    .start({apiPort})
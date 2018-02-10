import Redis from 'redis'
import Bluebird from 'bluebird'
Bluebird.promisifyAll(Redis.RedisClient.prototype);
Bluebird.promisifyAll(Redis.Multi.prototype);

export default function createRedisClient({redisUri}) {
    return Redis.createClient({
        url: redisUri,
    })
}
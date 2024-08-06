import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (error) => {
      console.error(`Redis client failed to connect: ${error.message || error.toString()}`);
    });
  }

  isAlive() {
    return this.client.PING();
  }

  async get(key) {
    return promisify(this.client.get).bind(this.client)(key);
  }

  async set(key, duration, value) {
    await promisify(this.client.setex).bind(this.client)(key, duration, value);
  }

  async del(key) {
    await promisify(this.client.del).bind(this.client)(key);
  }
}

export const redisClient = new RedisClient();
export default redisClient;

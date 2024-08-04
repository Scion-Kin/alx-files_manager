import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.connected = true;
    this.client.on('error', (error) => {
      console.error('Redis client failed to connect:', error.message || error.toString());
      this.client.connected = false;
    });
    this.client.on('connect', () => {
      this.client.connected = true;
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return promisify(this.client.get).bind(this.client)(key);
  }

  async set(key, duration, value) {
    await promisify(this.client.setex).bind(this.client)(key, duration, value);
  }

  async del(key) {
    await promisify(this.client.DEL).bind(this.client)(key);
  }
}

export const redisClient = new RedisClient();
export default redisClient;

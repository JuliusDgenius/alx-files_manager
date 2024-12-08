import { createClient } from 'redis';
import { promisify } from 'util';

export class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => console.log(err));

    // Promisify the methods we need
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return this.getAsync(key);
  }

  async set(key, value, time) {
    return this.setAsync(key, value, 'EX', time);
  }

  async del(key) {
    return this.delAsync(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
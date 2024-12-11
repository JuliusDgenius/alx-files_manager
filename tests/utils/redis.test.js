import { expect } from 'chai';
import redisClient from '../../utils/redis';

describe('RedisClient', () => {
  it('should be alive', () => {
    expect(redisClient.isAlive()).to.be.true;
  });

  it('should set and get value', async () => {
    await redisClient.set('test_key', 'test_value', 10);
    const value = await redisClient.get('test_key');
    expect(value).to.equal('test_value');
  });

  it('should expire key', async () => {
    await redisClient.set('test_key_exp', 'test_value', 1);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const value = await redisClient.get('test_key_exp');
    expect(value).to.be.null;
  });

  it('should delete key', async () => {
    await redisClient.set('test_key_del', 'test_value', 10);
    await redisClient.del('test_key_del');
    const value = await redisClient.get('test_key_del');
    expect(value).to.be.null;
  });
});

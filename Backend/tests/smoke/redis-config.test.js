/**
 * Smoke tests for the Redis connection resolver.
 *
 * Real bug: the queue + cache only read REDIS_HOST/PORT/PASSWORD and defaulted
 * to localhost:6379, ignoring REDIS_URL. On hosts that provide only REDIS_URL
 * (cPanel — redis://:pass@127.0.0.1:35399/0) that meant the wrong Redis, so the
 * shipping-sync queue was never drained and orders stuck at "Pending Sync".
 */

jest.mock('../../config/logging.js', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { resolveRedis } = require('../../services/redisService.js');

const REDIS_KEYS = ['REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 'REDIS_DB', 'REDIS_URL'];
let saved;
beforeEach(() => { saved = {}; REDIS_KEYS.forEach((k) => { saved[k] = process.env[k]; delete process.env[k]; }); });
afterEach(() => { REDIS_KEYS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }); });

describe('resolveRedis', () => {
  test('parses REDIS_URL when discrete vars are absent', () => {
    process.env.REDIS_URL = 'redis://:secretpass@127.0.0.1:35399/0';
    const c = resolveRedis();
    expect(c.host).toBe('127.0.0.1');
    expect(c.port).toBe(35399);
    expect(c.password).toBe('secretpass');
    expect(c.db).toBe(0);
  });

  test('discrete vars take priority over REDIS_URL', () => {
    process.env.REDIS_HOST = '10.0.0.5';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 'discrete';
    process.env.REDIS_URL = 'redis://:other@127.0.0.1:35399/2';
    const c = resolveRedis();
    expect(c.host).toBe('10.0.0.5');
    expect(c.port).toBe(6380);
    expect(c.password).toBe('discrete');
  });

  test('rediss:// enables TLS', () => {
    process.env.REDIS_URL = 'rediss://:p@redis.example.com:6379/1';
    const c = resolveRedis();
    expect(c.host).toBe('redis.example.com');
    expect(c.db).toBe(1);
    expect(c.tls).toBeDefined();
  });

  test('falls back to localhost:6379 when nothing is set', () => {
    const c = resolveRedis();
    expect(c.host).toBe('localhost');
    expect(c.port).toBe(6379);
  });
});

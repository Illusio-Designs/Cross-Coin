/**
 * Smoke tests for the integration retry queue.
 *
 * Bull tries to connect to Redis on require. We don't want the test
 * suite to depend on a running Redis, so we mock the `bull` module
 * to throw — the service catches that and falls back to inline
 * processing, which is the path we WANT to test (Redis-down on dev).
 */

jest.mock('../../config/logging.js', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Force the Bull import to throw so the queue falls back to inline mode.
jest.mock('bull', () => { throw new Error('Bull mocked off for smoke test'); });

describe('integration queue — inline fallback (no Redis)', () => {
  let queue;
  beforeEach(() => {
    jest.resetModules();
    queue = require('../../services/integrationQueue.js');
  });

  test('getStats() reports inline mode when Bull is unavailable', async () => {
    const stats = await queue.getStats();
    expect(stats.available).toBe(false);
    expect(stats.mode).toBe('inline');
  });

  test('enqueue runs the registered processor inline via setImmediate', async () => {
    const calls = [];
    queue.registerProcessor('test:echo', (job) => {
      calls.push(job.data);
    });

    await queue.enqueue('test:echo', { hello: 'world' });

    // Inline processor runs via setImmediate, so flush the queue.
    await new Promise((resolve) => setImmediate(resolve));
    expect(calls).toEqual([{ hello: 'world' }]);
  });

  test('enqueue with unknown job name drops the payload but does not throw', async () => {
    const result = await queue.enqueue('test:never-registered', { a: 1 });
    expect(result).toBeNull();
  });

  test('registerProcessor accepts (name, concurrency, fn) signature', async () => {
    const calls = [];
    queue.registerProcessor('test:multi', 4, (job) => { calls.push(job.data); });
    await queue.enqueue('test:multi', { n: 1 });
    await new Promise((resolve) => setImmediate(resolve));
    expect(calls).toEqual([{ n: 1 }]);
  });

  test('close() is safe to call when Bull never started', async () => {
    await expect(queue.close()).resolves.toBeUndefined();
  });
});

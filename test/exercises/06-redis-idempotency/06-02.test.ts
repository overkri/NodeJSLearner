import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects, expectThrows } from '../../helpers/assertions.js';
import {
  RedisIdempotencyCache,
  type RedisCacheCommands,
} from '../../../src/exercises/06-redis-idempotency/06-02.js';

interface FakeCache extends RedisCacheCommands {
  readonly values: Map<string, string>;
  readonly sets: Array<{ key: string; value: string; ex: number }>;
  readonly deletes: string[];
}

function fakeCache(initial: Record<string, string> = {}): FakeCache {
  const values = new Map(Object.entries(initial));
  const sets: Array<{ key: string; value: string; ex: number }> = [];
  const deletes: string[] = [];
  return {
    values,
    sets,
    deletes,
    async get(key) {
      return values.get(key) ?? null;
    },
    async set(key, value, options) {
      values.set(key, value);
      sets.push({ key, value, ex: options.EX });
      return 'OK';
    },
    async del(key) {
      deletes.push(key);
      return values.delete(key) ? 1 : 0;
    },
  };
}

exerciseTest('06-02 cache stores and replays a response with TTL', async () => {
  const redis = fakeCache();
  const cache = new RedisIdempotencyCache(redis, { ttlSeconds: 60 });

  await cache.put('key-1', 'hash-1', { transferId: 't1' });
  const lookup = await cache.get('key-1', 'hash-1');

  assert.deepEqual(lookup, { status: 'replay', response: { transferId: 't1' } });
  assert.equal(redis.sets[0]?.key, 'idem:cache:v1:key-1');
  assert.equal(redis.sets[0]?.ex, 60);
});

exerciseTest('06-02 cache distinguishes miss, conflict and falsy responses', async () => {
  const redis = fakeCache();
  const cache = new RedisIdempotencyCache(redis, { ttlSeconds: 60 });

  assert.deepEqual(await cache.get('missing', 'hash'), { status: 'miss' });

  await cache.put('key-1', 'hash-1', false);
  assert.deepEqual(await cache.get('key-1', 'hash-1'), {
    status: 'replay',
    response: false,
  });
  assert.deepEqual(await cache.get('key-1', 'hash-2'), { status: 'conflict' });
});

exerciseTest('06-02 cache deletes corrupt entries and treats them as miss', async () => {
  const redis = fakeCache({
    'idem:cache:v1:bad-json': '{ nope',
    'idem:cache:v1:bad-shape': JSON.stringify({ version: 2, requestHash: 'h' }),
  });
  const cache = new RedisIdempotencyCache(redis, { ttlSeconds: 60 });

  assert.deepEqual(await cache.get('bad-json', 'h'), { status: 'miss' });
  assert.deepEqual(await cache.get('bad-shape', 'h'), { status: 'miss' });
  assert.deepEqual(redis.deletes, ['idem:cache:v1:bad-json', 'idem:cache:v1:bad-shape']);
});

exerciseTest('06-02 cache validates constructor and keys', async () => {
  const redis = fakeCache();
  expectThrows(() => new RedisIdempotencyCache(redis, { ttlSeconds: 0 }), RangeError);

  const cache = new RedisIdempotencyCache(redis, { ttlSeconds: 1 });
  await expectRejects(cache.get('', 'hash'), /1\.\.200/);
  await expectRejects(cache.put('key', '', null), /1\.\.200/);
});

exerciseTest('06-02 cache uses a custom prefix', async () => {
  const redis = fakeCache();
  const cache = new RedisIdempotencyCache(redis, {
    ttlSeconds: 5,
    keyPrefix: 'test:v1:',
  });

  await cache.put('key', 'hash', 1);
  assert.equal(redis.sets[0]?.key, 'test:v1:key');
});

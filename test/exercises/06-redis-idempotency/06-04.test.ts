import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  RATE_LIMIT_SCRIPT,
  checkRateLimit,
  type RateLimitRedis,
} from '../../../src/exercises/06-redis-idempotency/06-04.js';

function fakeRedis(reply: unknown): {
  redis: RateLimitRedis;
  calls: Array<{ script: string; keys: readonly string[]; args: readonly string[] }>;
} {
  const calls: Array<{ script: string; keys: readonly string[]; args: readonly string[] }> = [];
  return {
    calls,
    redis: {
      async eval(script, options) {
        calls.push({ script, keys: options.keys, args: options.arguments });
        return reply;
      },
    },
  };
}

exerciseTest('06-04 rate limit allows requests under the limit', async () => {
  const { redis, calls } = fakeRedis([2, 30]);
  const result = await checkRateLimit(redis, 'transfer:alice', 5, 60);

  assert.deepEqual(result, { allowed: true, limit: 5, remaining: 3, resetSeconds: 30 });
  assert.equal(calls[0]?.script, RATE_LIMIT_SCRIPT);
  assert.match(RATE_LIMIT_SCRIPT, /incr/);
  assert.match(RATE_LIMIT_SCRIPT, /expire/);
  assert.deepEqual(calls[0]?.keys, ['ratelimit:v1:transfer:alice']);
  assert.deepEqual(calls[0]?.args, ['60']);
});

exerciseTest(
  '06-04 rate limit denies requests over the limit without negative remaining',
  async () => {
    const { redis } = fakeRedis([8, 10]);
    assert.deepEqual(await checkRateLimit(redis, 'key', 5, 60), {
      allowed: false,
      limit: 5,
      remaining: 0,
      resetSeconds: 10,
    });
  },
);

exerciseTest('06-04 rate limit validates arguments', async () => {
  const { redis, calls } = fakeRedis([1, 1]);

  await expectRejects(checkRateLimit(redis, '   ', 1, 1), /1\.\.200/);
  await expectRejects(checkRateLimit(redis, 'key', 0, 1), RangeError);
  await expectRejects(checkRateLimit(redis, 'key', 1.5, 1), RangeError);
  await expectRejects(checkRateLimit(redis, 'key', 1, 0), RangeError);
  assert.equal(calls.length, 0);
});

exerciseTest('06-04 rate limit rejects malformed Redis replies', async () => {
  await expectRejects(checkRateLimit(fakeRedis('nope').redis, 'key', 1, 1), /Unexpected/);
  await expectRejects(checkRateLimit(fakeRedis([0, 1]).redis, 'key', 1, 1), /Malformed/);
  await expectRejects(checkRateLimit(fakeRedis([1, 'x']).redis, 'key', 1, 1), /Malformed/);
});

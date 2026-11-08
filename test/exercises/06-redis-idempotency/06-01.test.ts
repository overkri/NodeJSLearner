import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects, expectThrows } from '../../helpers/assertions.js';
import {
  RELEASE_LOCK_SCRIPT,
  acquireLock,
  lockKey,
  releaseLock,
  type RedisLockCommands,
} from '../../../src/exercises/06-redis-idempotency/06-01.js';

exerciseTest('06-01 acquireLock uses SET NX PX and reports ownership', async () => {
  const calls: Array<{ key: string; value: string; options: { NX: true; PX: number } }> = [];
  const redis: RedisLockCommands = {
    async set(key, value, options) {
      calls.push({ key, value, options });
      return 'OK';
    },
    async eval() {
      return 1;
    },
  };

  assert.equal(await acquireLock(redis, 'transfer:42', 'token-1', 5_000), true);
  assert.deepEqual(calls, [
    {
      key: 'lock:v1:transfer:42',
      value: 'token-1',
      options: { NX: true, PX: 5_000 },
    },
  ]);
});

exerciseTest('06-01 acquireLock returns false when the key exists', async () => {
  const redis: RedisLockCommands = {
    async set() {
      return null;
    },
    async eval() {
      return 0;
    },
  };
  assert.equal(await acquireLock(redis, 'resource', 'token', 100), false);
});

exerciseTest('06-01 releaseLock uses compare-and-delete Lua', async () => {
  const calls: Array<{ script: string; keys: readonly string[]; args: readonly string[] }> = [];
  const redis: RedisLockCommands = {
    async set() {
      return 'OK';
    },
    async eval(script, options) {
      calls.push({ script, keys: options.keys, args: options.arguments });
      return 1;
    },
  };

  assert.equal(await releaseLock(redis, 'transfer:42', 'token-1'), true);
  assert.equal(calls[0]?.script, RELEASE_LOCK_SCRIPT);
  assert.match(RELEASE_LOCK_SCRIPT, /redis\.call\("get"/);
  assert.match(RELEASE_LOCK_SCRIPT, /redis\.call\("del"/);
  assert.deepEqual(calls[0]?.keys, ['lock:v1:transfer:42']);
  assert.deepEqual(calls[0]?.args, ['token-1']);
});

exerciseTest('06-01 releaseLock returns false when token does not match', async () => {
  const redis: RedisLockCommands = {
    async set() {
      return 'OK';
    },
    async eval() {
      return 0;
    },
  };
  assert.equal(await releaseLock(redis, 'resource', 'stale-token'), false);
});

exerciseTest('06-01 lock helpers validate input', async () => {
  const redis: RedisLockCommands = {
    async set() {
      return 'OK';
    },
    async eval() {
      return 1;
    },
  };

  expectThrows(() => lockKey('   '), /1\.\.200/);
  await expectRejects(acquireLock(redis, 'r', '', 100), /token/);
  await expectRejects(acquireLock(redis, 'r', 't', 99), /TTL/);
  await expectRejects(releaseLock(redis, 'r', ''), /token/);
});

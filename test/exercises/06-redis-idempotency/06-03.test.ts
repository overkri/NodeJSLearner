import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects, expectThrows } from '../../helpers/assertions.js';
import { IdempotencyConflictError } from '../../../src/domain/errors.js';
import {
  IdempotencyCoordinator,
  IdempotencyInProgressError,
  type DurableIdempotencyStore,
  type IdempotencyCachePort,
  type LockPort,
} from '../../../src/exercises/06-redis-idempotency/06-03.js';
import type { CacheLookup } from '../../../src/exercises/06-redis-idempotency/06-02.js';

interface Fake {
  readonly calls: string[];
  readonly cache: IdempotencyCachePort;
  readonly locks: LockPort;
  readonly store: DurableIdempotencyStore;
  readonly cachedWrites: unknown[];
  readonly released: Array<{ resource: string; token: string }>;
}

function setup(
  options: {
    lookups?: CacheLookup[];
    acquire?: boolean;
    execute?: (operation: () => Promise<unknown>) => Promise<{ value: unknown; replayed: boolean }>;
    cacheGetError?: boolean;
    cachePutError?: boolean;
    releaseError?: boolean;
  } = {},
): Fake {
  const calls: string[] = [];
  const lookups = [...(options.lookups ?? [{ status: 'miss' }, { status: 'miss' }])];
  const cachedWrites: unknown[] = [];
  const released: Array<{ resource: string; token: string }> = [];

  const cache: IdempotencyCachePort = {
    async get() {
      calls.push('cache:get');
      if (options.cacheGetError === true) {
        throw new Error('redis down');
      }
      return lookups.shift() ?? { status: 'miss' };
    },
    async put(_key, _hash, response) {
      calls.push('cache:put');
      if (options.cachePutError === true) {
        throw new Error('redis write failed');
      }
      cachedWrites.push(response);
    },
  };

  const locks: LockPort = {
    async acquire() {
      calls.push('lock:acquire');
      return options.acquire ?? true;
    },
    async release(resource, token) {
      calls.push('lock:release');
      released.push({ resource, token });
      if (options.releaseError === true) {
        throw new Error('release failed');
      }
      return true;
    },
  };

  const store: DurableIdempotencyStore = {
    async execute<T>(_key: string, _hash: string, operation: () => Promise<T>) {
      calls.push('store:execute');
      if (options.execute !== undefined) {
        return (await options.execute(operation)) as { value: T; replayed: boolean };
      }
      return { value: await operation(), replayed: false };
    },
  };

  return { calls, cache, locks, store, cachedWrites, released };
}

exerciseTest('06-03 cache replay short-circuits without lock or durable execution', async () => {
  const fake = setup({ lookups: [{ status: 'replay', response: { id: 'stored' } }] });
  const coordinator = new IdempotencyCoordinator(fake);

  const result = await coordinator.execute('key', 'hash', async () => {
    throw new Error('must not run');
  });

  assert.deepEqual(result, { value: { id: 'stored' }, replayed: true });
  assert.deepEqual(fake.calls, ['cache:get']);
});

exerciseTest('06-03 cache conflict throws without running the operation', async () => {
  const fake = setup({ lookups: [{ status: 'conflict' }] });
  const coordinator = new IdempotencyCoordinator(fake);

  await expectRejects(
    coordinator.execute('key', 'different-hash', async () => 1),
    IdempotencyConflictError,
  );
  assert.deepEqual(fake.calls, ['cache:get']);
});

exerciseTest('06-03 missing cache acquires lock, executes, caches and releases', async () => {
  const fake = setup();
  const coordinator = new IdempotencyCoordinator(fake, {
    lockTtlMs: 5_000,
    tokenGenerator: () => 'token-1',
  });

  const result = await coordinator.execute('key-1', 'hash-1', async () => 42);

  assert.deepEqual(result, { value: 42, replayed: false });
  assert.deepEqual(fake.calls, [
    'cache:get',
    'lock:acquire',
    'cache:get',
    'store:execute',
    'cache:put',
    'lock:release',
  ]);
  assert.deepEqual(fake.cachedWrites, [42]);
  assert.deepEqual(fake.released, [{ resource: 'idem:key-1', token: 'token-1' }]);
});

exerciseTest('06-03 lock contention rejects without executing', async () => {
  const fake = setup({ acquire: false });
  const coordinator = new IdempotencyCoordinator(fake);

  await expectRejects(
    coordinator.execute('key', 'hash', async () => 1),
    IdempotencyInProgressError,
  );
  assert.deepEqual(fake.calls, ['cache:get', 'lock:acquire']);
});

exerciseTest('06-03 second cache check after lock catches a completed peer', async () => {
  const fake = setup({
    lookups: [{ status: 'miss' }, { status: 'replay', response: 7 }],
  });
  const coordinator = new IdempotencyCoordinator(fake);

  assert.deepEqual(await coordinator.execute('key', 'hash', async () => 1), {
    value: 7,
    replayed: true,
  });
  assert.equal(fake.calls.includes('store:execute'), false);
  assert.equal(fake.calls.includes('lock:release'), true);
});

exerciseTest('06-03 operation failure releases the lock and caches nothing', async () => {
  const fake = setup();
  const coordinator = new IdempotencyCoordinator(fake);

  await expectRejects(
    coordinator.execute('key', 'hash', async () => {
      throw new Error('operation failed');
    }),
    /operation failed/,
  );
  assert.equal(fake.calls.includes('lock:release'), true);
  assert.equal(fake.calls.includes('cache:put'), false);
});

exerciseTest('06-03 cache outages are non-fatal, release errors do not mask success', async () => {
  const fake = setup({
    cacheGetError: true,
    cachePutError: true,
    releaseError: true,
  });
  const coordinator = new IdempotencyCoordinator(fake);

  assert.deepEqual(await coordinator.execute('key', 'hash', async () => 'ok'), {
    value: 'ok',
    replayed: false,
  });
});

exerciseTest('06-03 durable replay is returned and cached', async () => {
  const fake = setup({
    execute: async () => ({ value: 'durable', replayed: true }),
  });
  const coordinator = new IdempotencyCoordinator(fake);

  assert.deepEqual(await coordinator.execute('key', 'hash', async () => 'unused'), {
    value: 'durable',
    replayed: true,
  });
  assert.deepEqual(fake.cachedWrites, ['durable']);
});

exerciseTest('06-03 validates lockTtlMs', () => {
  const fake = setup();
  expectThrows(() => new IdempotencyCoordinator(fake, { lockTtlMs: 99 }), RangeError);
});

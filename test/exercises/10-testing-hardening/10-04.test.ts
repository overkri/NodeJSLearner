import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import { Barrier, createDeferred } from '../../../src/exercises/10-testing-hardening/10-04.js';

exerciseTest('10-04 Deferred settles exactly once', async () => {
  const deferred = createDeferred<number>();
  deferred.resolve(1);
  deferred.resolve(2);
  deferred.reject(new Error('late'));

  assert.equal(await deferred.promise, 1);
});

exerciseTest('10-04 Deferred can reject', async () => {
  const deferred = createDeferred<number>();
  deferred.reject(new Error('boom'));

  await assert.rejects(deferred.promise, /boom/);
});

exerciseTest('10-04 Barrier releases all waiters together', async () => {
  const barrier = new Barrier(4);
  const order: string[] = [];

  const waits = [1, 2, 3].map(async (id) => {
    await barrier.wait();
    order.push(`done-${id}`);
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(barrier.waiting, 3);
  barrier.release();
  await Promise.all(waits);
  assert.equal(order.length, 3);
  assert.equal(barrier.waiting, 0);
});

exerciseTest('10-04 Barrier release is manual and one-shot', async () => {
  const barrier = new Barrier(5);
  const first = barrier.wait();
  const second = barrier.wait();
  assert.equal(barrier.waiting, 2);

  barrier.release();
  await Promise.all([first, second]);
  await barrier.wait();
  barrier.release();
  assert.equal(barrier.waiting, 0);
});

exerciseTest('10-04 Barrier validates count', () => {
  expectThrows(() => new Barrier(0), RangeError);
  expectThrows(() => new Barrier(1.5), RangeError);
});

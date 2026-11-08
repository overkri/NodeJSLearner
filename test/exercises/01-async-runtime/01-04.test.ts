import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  OperationCancelledError,
  TimeoutError,
  toError,
  withTimeout,
} from '../../../src/exercises/01-async-runtime/01-04.js';

exerciseTest('01-04 withTimeout returns a fast result and clears the timer', async () => {
  let signalWasAborted = true;
  const result = await withTimeout(async (signal) => {
    signalWasAborted = signal.aborted;
    return 42;
  }, 50);

  assert.equal(result, 42);
  assert.equal(signalWasAborted, false);
  await new Promise((resolve) => setTimeout(resolve, 60));
});

exerciseTest('01-04 withTimeout rejects with TimeoutError and aborts the signal', async () => {
  let observedAbort = false;
  const startedAt = Date.now();

  await expectRejects(
    withTimeout(
      (signal) =>
        new Promise((resolve) => {
          signal.addEventListener('abort', () => {
            observedAbort = true;
            resolve('late');
          });
        }),
      10,
    ),
    TimeoutError,
  );

  assert.equal(observedAbort, true);
  assert.ok(Date.now() - startedAt < 1000);
});

exerciseTest('01-04 withTimeout propagates operation errors unchanged', async () => {
  const failure = new Error('boom');
  await expectRejects(
    withTimeout(async () => {
      throw failure;
    }, 50),
    /boom/,
  );
});

exerciseTest('01-04 external abort cancels the operation', async () => {
  const controller = new AbortController();
  const promise = withTimeout(() => new Promise((resolve) => setTimeout(resolve, 50)), 1_000, {
    signal: controller.signal,
  });
  controller.abort();

  await expectRejects(promise, OperationCancelledError);
});

exerciseTest('01-04 already-aborted signal rejects before starting work', async () => {
  const controller = new AbortController();
  controller.abort();
  let started = false;

  await expectRejects(
    withTimeout(
      async () => {
        started = true;
        return 1;
      },
      100,
      { signal: controller.signal },
    ),
    OperationCancelledError,
  );
  assert.equal(started, false);
});

exerciseTest('01-04 timeout ignores a late settlement without unhandled rejection', async () => {
  await expectRejects(
    withTimeout(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error('late failure')), 20);
        }),
      5,
    ),
    TimeoutError,
  );
  await new Promise((resolve) => setTimeout(resolve, 40));
});

exerciseTest('01-04 validates timeout and normalizes non-Error values', async () => {
  await expectRejects(
    withTimeout(async () => 1, -1),
    RangeError,
  );
  await expectRejects(
    withTimeout(async () => 1, Number.NaN),
    RangeError,
  );

  const original = new Error('original');
  assert.equal(toError(original), original);
  assert.equal(toError('plain').message, 'plain');
  assert.equal(toError({ reason: 'x' }).message, 'Non-Error thrown: [object Object]');
});

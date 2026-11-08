import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import { waitFor, WaitForTimeoutError } from '../../../src/exercises/10-testing-hardening/10-01.js';

exerciseTest('10-01 waitFor returns the first non-undefined value', async () => {
  const values: Array<number | undefined> = [undefined, undefined, 42];
  let calls = 0;

  const result = await waitFor(
    async () => {
      calls += 1;
      return values.shift();
    },
    { timeoutMs: 100, intervalMs: 0 },
  );

  assert.equal(result, 42);
  assert.equal(calls, 3);
});

exerciseTest('10-01 waitFor preserves a probe error as cause on timeout', async () => {
  const failure = await expectRejects(
    waitFor(
      async () => {
        throw new Error('not ready');
      },
      { timeoutMs: 5, intervalMs: 1, sleep: async () => undefined },
    ),
    WaitForTimeoutError,
  );

  assert.ok(failure instanceof WaitForTimeoutError);
  assert.ok(failure.cause instanceof Error);
  assert.match(failure.cause.message, /not ready/);
});

exerciseTest('10-01 waitFor uses an injectable clock and sleep', async () => {
  let time = 0;
  const delays: number[] = [];

  const result = await waitFor(async () => (time >= 30 ? 'ready' : undefined), {
    timeoutMs: 100,
    intervalMs: 10,
    now: () => time,
    sleep: async (delay) => {
      delays.push(delay);
      time += delay;
    },
  });

  assert.equal(result, 'ready');
  assert.deepEqual(delays, [10, 10, 10]);
});

exerciseTest('10-01 waitFor times out without hanging', async () => {
  let time = 0;
  const error = await expectRejects(
    waitFor(async () => undefined, {
      timeoutMs: 25,
      intervalMs: 10,
      now: () => time,
      sleep: async (delay) => {
        time += delay;
      },
    }),
    WaitForTimeoutError,
  );

  assert.ok(error instanceof WaitForTimeoutError);
  assert.equal(error.code, 'WAIT_FOR_TIMEOUT');
});

exerciseTest('10-01 waitFor validates options before probing', async () => {
  let calls = 0;
  const probe = async (): Promise<undefined> => {
    calls += 1;
    return undefined;
  };

  await expectRejects(waitFor(probe, { timeoutMs: 0 }), RangeError);
  await expectRejects(waitFor(probe, { timeoutMs: 10, intervalMs: -1 }), RangeError);
  assert.equal(calls, 0);
});

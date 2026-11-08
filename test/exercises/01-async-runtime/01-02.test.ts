import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  AbortOperationError,
  mapWithConcurrency,
} from '../../../src/exercises/01-async-runtime/01-02.js';

function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

exerciseTest('01-02 mapWithConcurrency is bounded and preserves order', async () => {
  // Probe first so an unimplemented starter is reported as TODO before deferred setup.
  assert.deepEqual(await mapWithConcurrency([], 1, async () => 1), []);

  const started: number[] = [];
  const releases = new Map<number, () => void>();
  let active = 0;
  let maximumActive = 0;

  const resultPromise = mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (item) => {
    started.push(item);
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise<void>((resolve) => releases.set(item, resolve));
    active -= 1;
    return item * 10;
  });
  void resultPromise.catch(() => {
    // Observed at the end of the test; keep an early TODO rejection handled.
  });

  await tick();
  assert.deepEqual(started, [1, 2]);
  assert.equal(active, 2);

  releases.get(1)?.();
  await tick();
  assert.deepEqual(started, [1, 2, 3]);

  releases.get(2)?.();
  await tick();
  assert.deepEqual(started, [1, 2, 3, 4]);

  for (const item of [3, 4, 5, 6]) {
    releases.get(item)?.();
    await tick();
  }

  assert.deepEqual(await resultPromise, [10, 20, 30, 40, 50, 60]);
  assert.equal(maximumActive, 2);
});

exerciseTest('01-02 mapWithConcurrency validates limit and empty input', async () => {
  await expectRejects(
    mapWithConcurrency([1], 0, async (item) => item),
    RangeError,
  );
  await expectRejects(
    mapWithConcurrency([1], 1.5, async (item) => item),
    RangeError,
  );
  assert.deepEqual(await mapWithConcurrency([], 4, async () => 1), []);
});

exerciseTest('01-02 mapper rejection propagates and settles in-flight work', async () => {
  const settled: number[] = [];
  const failure = new Error('mapper failed');

  await expectRejects(
    mapWithConcurrency([1, 2, 3, 4], 2, async (item) => {
      if (item === 2) {
        throw failure;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
      settled.push(item);
      return item;
    }),
    /mapper failed/,
  );

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(
    settled.sort((a, b) => a - b),
    [1],
  );
});

exerciseTest('01-02 abort stops new work and rejects', async () => {
  const controller = new AbortController();
  let calls = 0;

  await expectRejects(
    mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (item) => {
        calls += 1;
        if (item === 1) {
          controller.abort();
        }
        await new Promise((resolve) => setTimeout(resolve, 1));
        return item;
      },
      { signal: controller.signal },
    ),
    AbortOperationError,
  );

  assert.ok(calls <= 2, `expected at most 2 calls, received ${calls}`);
});

exerciseTest('01-02 already-aborted signal rejects before invoking mapper', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;

  await expectRejects(
    mapWithConcurrency(
      [1, 2],
      1,
      async (item) => {
        calls += 1;
        return item;
      },
      { signal: controller.signal },
    ),
    AbortOperationError,
  );
  assert.equal(calls, 0);
});

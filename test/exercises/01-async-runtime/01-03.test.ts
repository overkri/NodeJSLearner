import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { sumInWorker } from '../../../src/exercises/01-async-runtime/01-03.js';

exerciseTest('01-03 sumInWorker computes a bigint sum off the main thread', async () => {
  assert.equal(await sumInWorker([1n, 2n, 3n]), 6n);
  assert.equal(await sumInWorker([]), 0n);
  assert.equal(await sumInWorker([-5n, 2n]), -3n);
});

exerciseTest('01-03 sumInWorker handles large inputs and repeated calls', async () => {
  const values = Array.from({ length: 100_000 }, (_, index) => BigInt(index));
  const expected = (99_999n * 100_000n) / 2n;

  const [first, second] = await Promise.all([sumInWorker(values), sumInWorker(values)]);
  assert.equal(first, expected);
  assert.equal(second, expected);
});

import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { runOrderingDemo } from '../../../src/exercises/01-async-runtime/01-01.js';

exerciseTest('01-01 event loop phases run in a deterministic order', async () => {
  const order = await runOrderingDemo();
  assert.deepEqual(order, [
    'sync',
    'microtask',
    'promise',
    'after-microtasks',
    'nextTick',
    'after-timer',
    'after-immediate',
  ]);
});

exerciseTest('01-01 each call produces an isolated sequence', async () => {
  const [first, second] = await Promise.all([runOrderingDemo(), runOrderingDemo()]);
  assert.deepEqual(first, second);
  assert.notEqual(first, second);
});

import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects, expectThrows } from '../../helpers/assertions.js';
import { injectFailures } from '../../../src/exercises/10-testing-hardening/10-05.js';

exerciseTest('10-05 injectFailures fails then delegates', async () => {
  const calls: string[] = [];
  const injected = injectFailures(
    async (value: string) => {
      calls.push(value);
      return value.toUpperCase();
    },
    { failures: 2, errorFactory: () => new Error('injected') },
  );

  await expectRejects(injected.run('a'), /injected/);
  await expectRejects(injected.run('b'), /injected/);
  assert.equal(await injected.run('c'), 'C');
  assert.deepEqual(calls, ['c']);
  assert.equal(injected.attempts(), 3);
  assert.equal(injected.failuresRemaining(), 0);
});

exerciseTest('10-05 injectFailures reset restores the schedule', async () => {
  let calls = 0;
  const injected = injectFailures(
    async () => {
      calls += 1;
      return calls;
    },
    { failures: 1 },
  );

  await expectRejects(injected.run(), /Injected failure/);
  assert.equal(await injected.run(), 1);
  injected.reset();
  assert.equal(injected.attempts(), 0);
  assert.equal(injected.failuresRemaining(), 1);
  await expectRejects(injected.run(), /Injected failure/);
});

exerciseTest('10-05 injectFailures with zero failures only delegates', async () => {
  const injected = injectFailures(async (a: number, b: number) => a + b, { failures: 0 });
  assert.equal(await injected.run(2, 3), 5);
  assert.equal(injected.attempts(), 1);
});

exerciseTest('10-05 injectFailures normalizes synchronous operation throws', async () => {
  const injected = injectFailures(
    () => {
      throw new Error('sync failure');
    },
    { failures: 0 },
  );

  await expectRejects(injected.run(), /sync failure/);
});

exerciseTest('10-05 injectFailures validates options', () => {
  expectThrows(() => injectFailures(async () => 1, { failures: -1 }), RangeError);
  expectThrows(() => injectFailures(async () => 1, { failures: 1.5 }), RangeError);
});

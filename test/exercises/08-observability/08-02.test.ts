import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects, expectThrows } from '../../helpers/assertions.js';
import {
  getRequestContext,
  requireRequestContext,
  runWithRequestContext,
} from '../../../src/exercises/08-observability/08-02.js';

exerciseTest('08-02 context survives awaits and nested async calls', async () => {
  const context = { requestId: 'req-1', route: '/transfers', principalId: 'customer-1' };

  const result = await runWithRequestContext(context, async () => {
    assert.deepEqual(getRequestContext(), context);
    await new Promise((resolve) => setTimeout(resolve, 1));
    const nested = await (async () => requireRequestContext())();
    return nested.requestId;
  });

  assert.equal(result, 'req-1');
  assert.equal(getRequestContext(), undefined);
});

exerciseTest('08-02 concurrent contexts are isolated', async () => {
  async function work(id: string): Promise<string> {
    return await runWithRequestContext({ requestId: id, route: '/work' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, id === 'a' ? 5 : 1));
      return requireRequestContext().requestId;
    });
  }

  const [a, b] = await Promise.all([work('a'), work('b')]);
  assert.equal(a, 'a');
  assert.equal(b, 'b');
});

exerciseTest('08-02 missing context is explicit', () => {
  assert.equal(getRequestContext(), undefined);
  expectThrows(() => requireRequestContext(), /not available/);
});

exerciseTest('08-02 context is frozen and validated', async () => {
  await runWithRequestContext({ requestId: 'r', route: '/' }, async () => {
    const context = requireRequestContext();
    expectThrows(() => {
      (context as { requestId: string }).requestId = 'changed';
    }, TypeError);
  });

  await expectRejects(
    () => runWithRequestContext({ requestId: '', route: '/' }, async () => undefined),
    /non-empty/,
  );
  await expectRejects(
    () => runWithRequestContext({ requestId: 'r', route: 'bad' }, async () => undefined),
    /must start/,
  );
});

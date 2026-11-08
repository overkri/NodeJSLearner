import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import { composeMiddleware, type Middleware } from '../../../src/exercises/03-raw-http/03-02.js';

interface TestContext {
  readonly trace: string[];
}

exerciseTest('03-02 middleware runs in onion order', async () => {
  const trace: string[] = [];
  const middlewares: Middleware<TestContext>[] = [
    async (ctx, next) => {
      ctx.trace.push('first:before');
      await next();
      ctx.trace.push('first:after');
    },
    async (ctx, next) => {
      ctx.trace.push('second:before');
      await next();
      ctx.trace.push('second:after');
    },
  ];

  await composeMiddleware(middlewares)({ trace }, async () => {
    trace.push('terminal');
  });

  assert.deepEqual(trace, [
    'first:before',
    'second:before',
    'terminal',
    'second:after',
    'first:after',
  ]);
});

exerciseTest('03-02 middleware can short-circuit', async () => {
  const trace: string[] = [];
  let terminalCalled = false;

  await composeMiddleware<TestContext>([
    async (ctx) => {
      ctx.trace.push('short-circuit');
    },
    async (ctx, next) => {
      ctx.trace.push('never');
      await next();
    },
  ])({ trace }, async () => {
    terminalCalled = true;
  });

  assert.deepEqual(trace, ['short-circuit']);
  assert.equal(terminalCalled, false);
});

exerciseTest('03-02 errors propagate through the chain and can be caught', async () => {
  const failure = new Error('inner failure');
  const trace: string[] = [];

  await composeMiddleware<TestContext>([
    async (_ctx, next) => {
      trace.push('outer:before');
      try {
        await next();
      } catch (error) {
        trace.push(`caught:${(error as Error).message}`);
      }
      trace.push('outer:after');
    },
    () => {
      trace.push('throwing');
      throw failure;
    },
  ])({ trace });

  assert.deepEqual(trace, ['outer:before', 'throwing', 'caught:inner failure', 'outer:after']);
});

exerciseTest('03-02 calling next twice rejects', async () => {
  await expectRejects(
    composeMiddleware<TestContext>([
      async (_ctx, next) => {
        await next();
        await next();
      },
    ])({ trace: [] }),
    /next\(\) called multiple times/,
  );
});

exerciseTest('03-02 empty chain runs the terminal exactly once', async () => {
  let calls = 0;
  await composeMiddleware<TestContext>([])({ trace: [] }, async () => {
    calls += 1;
  });
  assert.equal(calls, 1);
});

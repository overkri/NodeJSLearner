import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import {
  ShutdownCoordinator,
  ShutdownTimeoutError,
  type ShutdownEvent,
  type ShutdownTask,
} from '../../../src/exercises/04-config-lifecycle/04-03.js';

exerciseTest('04-03 shutdown closes tasks in order and reports success', async () => {
  const order: string[] = [];
  const events: ShutdownEvent[] = [];
  const tasks: ShutdownTask[] = [
    {
      name: 'http',
      close: async () => {
        order.push('http');
      },
    },
    {
      name: 'kafka',
      close: async () => {
        await new Promise((resolve) => setTimeout(resolve, 2));
        order.push('kafka');
      },
    },
    {
      name: 'pg',
      close: async () => {
        order.push('pg');
      },
    },
  ];

  const coordinator = new ShutdownCoordinator(tasks, {
    timeoutMs: 100,
    logger: (event) => events.push(event),
  });

  assert.equal(coordinator.state, 'running');
  const report = await coordinator.shutdown('SIGTERM');

  assert.deepEqual(order, ['http', 'kafka', 'pg']);
  assert.equal(report.reason, 'SIGTERM');
  assert.equal(report.timedOut, false);
  assert.deepEqual(report.failures, []);
  assert.equal(coordinator.state, 'stopped');
  assert.ok(events.some((event) => event.type === 'shutdown:done'));
});

exerciseTest('04-03 shutdown is idempotent and returns the same promise', async () => {
  let calls = 0;
  const coordinator = new ShutdownCoordinator(
    [
      {
        name: 'http',
        close: async () => {
          calls += 1;
          await new Promise((resolve) => setTimeout(resolve, 5));
        },
      },
    ],
    { timeoutMs: 100 },
  );

  const first = coordinator.shutdown('SIGTERM');
  const second = coordinator.shutdown('SIGINT');
  assert.equal(first, second);

  const [firstReport, secondReport] = await Promise.all([first, second]);
  assert.equal(firstReport, secondReport);
  assert.equal(firstReport.reason, 'SIGTERM');
  assert.equal(calls, 1);
  assert.equal(coordinator.shutdown('again'), first);
});

exerciseTest('04-03 task failures are collected and later tasks still run', async () => {
  const order: string[] = [];
  const coordinator = new ShutdownCoordinator(
    [
      {
        name: 'http',
        close: async () => {
          order.push('http');
          throw new Error('http close failed');
        },
      },
      {
        name: 'pg',
        close: async () => {
          order.push('pg');
        },
      },
    ],
    { timeoutMs: 100 },
  );

  const report = await coordinator.shutdown('test');
  assert.deepEqual(order, ['http', 'pg']);
  assert.equal(report.failures.length, 1);
  assert.equal(report.failures[0]?.name, 'http');
  assert.match(report.failures[0]?.error.message ?? '', /http close failed/);
});

exerciseTest('04-03 a hung task is bounded by the shutdown timeout', async () => {
  let laterStarted = false;
  let observedAbort = false;
  const coordinator = new ShutdownCoordinator(
    [
      {
        name: 'hung',
        close: (signal) =>
          new Promise<void>((_resolve, reject) => {
            signal.addEventListener('abort', () => {
              observedAbort = true;
              reject(new ShutdownTimeoutError(20));
            });
          }),
      },
      {
        name: 'later',
        close: async () => {
          laterStarted = true;
        },
      },
    ],
    { timeoutMs: 20 },
  );

  const startedAt = Date.now();
  const report = await coordinator.shutdown('test');

  assert.equal(report.timedOut, true);
  assert.equal(observedAbort, true);
  assert.equal(laterStarted, false);
  assert.equal(report.failures[0]?.error instanceof ShutdownTimeoutError, true);
  assert.ok(Date.now() - startedAt < 1_000);
});

exerciseTest('04-03 ignores a task that never settles after timeout', async () => {
  const coordinator = new ShutdownCoordinator(
    [
      {
        name: 'never',
        close: () => new Promise<void>(() => undefined),
      },
    ],
    { timeoutMs: 10 },
  );

  const report = await coordinator.shutdown('test');
  assert.equal(report.timedOut, true);
  assert.equal(coordinator.state, 'stopped');
});

exerciseTest('04-03 rejects invalid timeout in the constructor', () => {
  expectThrows(() => new ShutdownCoordinator([], { timeoutMs: 0 }), RangeError);
});

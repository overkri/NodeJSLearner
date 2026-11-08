import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  runHealthChecks,
  type HealthCheck,
} from '../../../src/exercises/08-observability/08-04.js';

exerciseTest('08-04 healthy checks report ok in input order', async () => {
  const checks: HealthCheck[] = [
    {
      name: 'postgres',
      check: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      },
    },
    {
      name: 'redis',
      check: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
      },
    },
  ];

  const report = await runHealthChecks(checks, { timeoutMs: 100 });
  assert.equal(report.status, 'ok');
  assert.deepEqual(
    report.checks.map((check) => check.name),
    ['postgres', 'redis'],
  );
  assert.equal(
    report.checks.every((check) => check.status === 'up'),
    true,
  );
});

exerciseTest('08-04 failures degrade readiness without leaking details', async () => {
  const report = await runHealthChecks([
    {
      name: 'postgres',
      check: async () => {
        throw new Error('password=secret connection refused');
      },
    },
    {
      name: 'redis',
      check: async () => undefined,
    },
  ]);

  assert.equal(report.status, 'degraded');
  assert.deepEqual(
    report.checks.map((check) => [check.name, check.status, check.error]),
    [
      ['postgres', 'down', 'check_failed'],
      ['redis', 'up', undefined],
    ],
  );
  assert.equal(JSON.stringify(report).includes('secret'), false);
});

exerciseTest('08-04 hung checks are bounded by timeout', async () => {
  const startedAt = Date.now();
  const report = await runHealthChecks(
    [
      {
        name: 'hung',
        check: () => new Promise<void>(() => undefined),
      },
    ],
    { timeoutMs: 10 },
  );

  assert.equal(report.status, 'degraded');
  assert.equal(report.checks[0]?.error, 'timeout');
  assert.ok(Date.now() - startedAt < 1_000);
});

exerciseTest('08-04 uses injectable clock for durations', async () => {
  let time = 100;
  const report = await runHealthChecks(
    [
      {
        name: 'clocked',
        check: async () => {
          time = 175;
        },
      },
    ],
    { timeoutMs: 100, now: () => time },
  );

  assert.equal(report.checks[0]?.durationMs, 75);
});

exerciseTest('08-04 validates checks before running them', async () => {
  let calls = 0;
  const check = async (): Promise<void> => {
    calls += 1;
  };

  await expectRejects(runHealthChecks([{ name: '', check }]), /non-empty/);
  await expectRejects(
    runHealthChecks([
      { name: 'same', check },
      { name: 'same', check },
    ]),
    /Duplicate/,
  );
  await expectRejects(runHealthChecks([], { timeoutMs: 0 }), RangeError);
  assert.equal(calls, 0);
});

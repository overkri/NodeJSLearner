import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import { publishWithRetry } from '../../../src/exercises/09-kafka-outbox/09-03.js';
import type { OutboxEventRecord } from '../../../src/exercises/09-kafka-outbox/09-02.js';

const event: OutboxEventRecord = {
  id: 'evt-1',
  aggregateType: 'transfer',
  aggregateId: 't1',
  eventType: 'TransferCreated',
  payload: {},
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  publishedAt: null,
  attempts: 0,
};

exerciseTest('09-03 publishWithRetry returns on first success', async () => {
  let attempts = 0;
  const delays: number[] = [];

  await publishWithRetry(
    {
      async publish() {
        attempts += 1;
      },
    },
    event,
    {
      sleep: async (delay) => {
        delays.push(delay);
      },
    },
  );

  assert.equal(attempts, 1);
  assert.deepEqual(delays, []);
});

exerciseTest('09-03 publishWithRetry uses exponential delays then succeeds', async () => {
  let attempts = 0;
  const delays: number[] = [];

  await publishWithRetry(
    {
      async publish() {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('broker unavailable');
        }
      },
    },
    event,
    {
      maxAttempts: 4,
      baseDelayMs: 100,
      sleep: async (delay) => {
        delays.push(delay);
      },
    },
  );

  assert.equal(attempts, 3);
  assert.deepEqual(delays, [100, 200]);
});

exerciseTest('09-03 publishWithRetry throws the last error after max attempts', async () => {
  let attempts = 0;
  const delays: number[] = [];

  await expectRejects(
    publishWithRetry(
      {
        async publish() {
          attempts += 1;
          throw new Error(`failure ${attempts}`);
        },
      },
      event,
      {
        maxAttempts: 3,
        baseDelayMs: 10,
        sleep: async (delay) => {
          delays.push(delay);
        },
      },
    ),
    /failure 3/,
  );

  assert.equal(attempts, 3);
  assert.deepEqual(delays, [10, 20]);
});

exerciseTest('09-03 publishWithRetry validates options before publishing', async () => {
  let calls = 0;
  const publisher = {
    async publish() {
      calls += 1;
    },
  };

  await expectRejects(publishWithRetry(publisher, event, { maxAttempts: 0 }), RangeError);
  await expectRejects(publishWithRetry(publisher, event, { maxAttempts: 1.5 }), RangeError);
  await expectRejects(publishWithRetry(publisher, event, { baseDelayMs: -1 }), RangeError);
  assert.equal(calls, 0);
});

exerciseTest('09-03 publishWithRetry normalizes non-Error failures', async () => {
  await expectRejects(
    publishWithRetry(
      {
        async publish() {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- intentional non-Error test
          throw 'string failure';
        },
      },
      event,
      { maxAttempts: 1 },
    ),
    /string failure/,
  );
});

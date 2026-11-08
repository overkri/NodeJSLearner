import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import { pollOutboxOnce } from '../../../src/exercises/09-kafka-outbox/09-06.js';
import type { OutboxEventRecord } from '../../../src/exercises/09-kafka-outbox/09-02.js';

function event(id: string): OutboxEventRecord {
  return {
    id,
    aggregateType: 'transfer',
    aggregateId: `transfer-${id}`,
    eventType: 'TransferCreated',
    payload: {},
    createdAt: new Date(),
    publishedAt: null,
    attempts: 1,
  };
}

exerciseTest('09-06 pollOutboxOnce publishes and marks every successful event', async () => {
  const marked: string[] = [];
  const published: string[] = [];
  const claimed: number[] = [];

  const result = await pollOutboxOnce(
    {
      async claimUnpublished(limit) {
        claimed.push(limit);
        return [event('1'), event('2')];
      },
      async markPublished(id) {
        marked.push(id);
      },
    },
    {
      async publish(item) {
        published.push(item.id);
      },
    },
    { batchSize: 10 },
  );

  assert.deepEqual(result, { claimed: 2, published: 2, failed: 0 });
  assert.deepEqual(claimed, [10]);
  assert.deepEqual(published, ['1', '2']);
  assert.deepEqual(marked, ['1', '2']);
});

exerciseTest('09-06 a poison event does not stop the batch or get marked', async () => {
  const marked: string[] = [];

  const result = await pollOutboxOnce(
    {
      async claimUnpublished() {
        return [event('bad'), event('good')];
      },
      async markPublished(id) {
        marked.push(id);
      },
    },
    {
      async publish(item) {
        if (item.id === 'bad') {
          throw new Error('invalid event');
        }
      },
    },
    { maxAttempts: 2, baseDelayMs: 1, sleep: async () => undefined },
  );

  assert.deepEqual(result, { claimed: 2, published: 1, failed: 1 });
  assert.deepEqual(marked, ['good']);
});

exerciseTest('09-06 retry options are applied per event', async () => {
  let attempts = 0;
  const delays: number[] = [];

  const result = await pollOutboxOnce(
    {
      async claimUnpublished() {
        return [event('flaky')];
      },
      async markPublished() {
        return undefined;
      },
    },
    {
      async publish() {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('broker down');
        }
      },
    },
    {
      maxAttempts: 3,
      baseDelayMs: 5,
      sleep: async (delay) => {
        delays.push(delay);
      },
    },
  );

  assert.deepEqual(result, { claimed: 1, published: 1, failed: 0 });
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [5, 10]);
});

exerciseTest('09-06 empty batch and invalid batchSize', async () => {
  let calls = 0;
  const store = {
    async claimUnpublished() {
      calls += 1;
      return [];
    },
    async markPublished() {
      return undefined;
    },
  };

  assert.deepEqual(await pollOutboxOnce(store, { publish: async () => undefined }), {
    claimed: 0,
    published: 0,
    failed: 0,
  });
  assert.equal(calls, 1);
  await expectRejects(
    pollOutboxOnce(store, { publish: async () => undefined }, { batchSize: 0 }),
    RangeError,
  );
  assert.equal(calls, 1);
});

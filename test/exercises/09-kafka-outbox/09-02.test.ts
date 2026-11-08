import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  CLAIM_OUTBOX_SQL,
  ENQUEUE_OUTBOX_SQL,
  claimOutboxBatch,
  enqueueOutbox,
  markOutboxPublished,
  type OutboxRow,
} from '../../../src/exercises/09-kafka-outbox/09-02.js';
import type { DomainEvent } from '../../../src/domain/events.js';

const event: DomainEvent = {
  eventId: '11111111-1111-4111-8111-111111111111',
  aggregateType: 'transfer',
  aggregateId: '22222222-2222-4222-8222-222222222222',
  eventType: 'TransferCreated',
  payload: { transferId: 't1', amount: '10.00' },
  occurredAt: new Date('2026-11-08T10:00:00.000Z'),
};

exerciseTest('09-02 enqueueOutbox inserts one parameterized row', async () => {
  const calls: Array<{ sql: string; params: readonly unknown[] | undefined }> = [];
  await enqueueOutbox(
    {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows: [] };
      },
    },
    event,
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.sql, ENQUEUE_OUTBOX_SQL);
  assert.deepEqual(calls[0]?.params, [
    event.eventId,
    'transfer',
    event.aggregateId,
    'TransferCreated',
    JSON.stringify(event.payload),
    event.occurredAt,
  ]);
});

exerciseTest('09-02 claimOutboxBatch claims with SKIP LOCKED and maps rows', async () => {
  const calls: Array<{ sql: string; params: readonly unknown[] | undefined }> = [];
  const rows: OutboxRow[] = [
    {
      id: 'evt-1',
      aggregate_type: 'transfer',
      aggregate_id: 't1',
      event_type: 'TransferCreated',
      payload: '{"amount":"10.00"}',
      created_at: '2026-11-08T10:00:00.000Z',
      published_at: null,
      attempts: '1',
    },
  ];

  const events = await claimOutboxBatch(
    {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows };
      },
    },
    25,
  );

  assert.equal(calls[0]?.sql, CLAIM_OUTBOX_SQL);
  assert.match(CLAIM_OUTBOX_SQL, /FOR UPDATE SKIP LOCKED/);
  assert.deepEqual(calls[0]?.params, [25]);
  assert.deepEqual(events[0], {
    id: 'evt-1',
    aggregateType: 'transfer',
    aggregateId: 't1',
    eventType: 'TransferCreated',
    payload: { amount: '10.00' },
    createdAt: new Date('2026-11-08T10:00:00.000Z'),
    publishedAt: null,
    attempts: 1,
  });
});

exerciseTest('09-02 claimOutboxBatch validates limit and handles empty rows', async () => {
  let calls = 0;
  const transaction = {
    async query() {
      calls += 1;
      return { rows: [] };
    },
  };

  assert.deepEqual(await claimOutboxBatch(transaction, 1), []);
  assert.equal(calls, 1);
  await expectRejects(claimOutboxBatch(transaction, 0), RangeError);
  await expectRejects(claimOutboxBatch(transaction, 1.5), RangeError);
  await expectRejects(claimOutboxBatch(transaction, 1_001), RangeError);
  assert.equal(calls, 1);
});

exerciseTest('09-02 markOutboxPublished updates the row', async () => {
  const calls: Array<{ sql: string; params: readonly unknown[] | undefined }> = [];
  await markOutboxPublished(
    {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows: [] };
      },
    },
    'evt-1',
  );

  assert.match(calls[0]?.sql ?? '', /SET published_at = now\(\)/);
  assert.deepEqual(calls[0]?.params, ['evt-1']);
});

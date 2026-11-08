import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import {
  EventValidationError,
  parseEventEnvelope,
} from '../../../src/exercises/09-kafka-outbox/09-01.js';

const transferId = '11111111-1111-4111-8111-111111111111';
const fromId = '22222222-2222-4222-8222-222222222222';
const toId = '33333333-3333-4333-8333-333333333333';

function envelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    eventId: '44444444-4444-4444-8444-444444444444',
    eventType: 'TransferCreated',
    aggregateType: 'transfer',
    aggregateId: transferId,
    occurredAt: '2026-11-08T10:00:00.000Z',
    payload: {
      transferId,
      fromAccountId: fromId,
      toAccountId: toId,
      amount: '10.50',
      currency: 'USD',
    },
    ...overrides,
  };
}

exerciseTest('09-01 parseEventEnvelope accepts a valid transfer event', () => {
  const parsed = parseEventEnvelope(envelope());
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.payload.amount, '10.50');
  assert.equal(parsed.aggregateId, transferId);
});

exerciseTest('09-01 parseEventEnvelope rejects schema and id violations', () => {
  expectThrows(() => parseEventEnvelope(null), EventValidationError);
  expectThrows(() => parseEventEnvelope(envelope({ schemaVersion: 2 })), /schemaVersion/);
  expectThrows(() => parseEventEnvelope(envelope({ eventType: 'TransferUpdated' })), /eventType/);
  expectThrows(
    () => parseEventEnvelope(envelope({ aggregateId: fromId })),
    /aggregateId must equal/,
  );
});

exerciseTest('09-01 parseEventEnvelope rejects invalid money and timestamps', () => {
  for (const amount of ['-1.00', '1.001', '1e3', 'abc', '0', 10.5]) {
    expectThrows(
      () =>
        parseEventEnvelope(
          envelope({
            payload: {
              transferId,
              fromAccountId: fromId,
              toAccountId: toId,
              amount,
              currency: 'USD',
            },
          }),
        ),
      EventValidationError,
    );
  }

  expectThrows(
    () => parseEventEnvelope(envelope({ occurredAt: '2026-11-08 10:00:00' })),
    /ISO-8601/,
  );
});

exerciseTest('09-01 parseEventEnvelope rejects unknown fields and bad currency', () => {
  expectThrows(
    () => parseEventEnvelope(envelope({ extra: true })),
    /Unrecognized key|unrecognized/i,
  );
  expectThrows(
    () =>
      parseEventEnvelope(
        envelope({
          payload: {
            transferId,
            fromAccountId: fromId,
            toAccountId: toId,
            amount: '1.00',
            currency: 'BTC',
          },
        }),
      ),
    /currency/,
  );
});

exerciseTest('09-01 errors do not echo secret payload values', () => {
  expectThrows(
    () =>
      parseEventEnvelope(
        envelope({
          payload: {
            transferId: 'not-a-uuid-secret-value',
            fromAccountId: fromId,
            toAccountId: toId,
            amount: '1.00',
            currency: 'USD',
          },
        }),
      ),
    (error: unknown) =>
      error instanceof EventValidationError && !error.message.includes('not-a-uuid-secret-value'),
  );
});

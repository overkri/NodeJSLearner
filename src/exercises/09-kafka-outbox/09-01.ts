import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 09-01
 * Topic: versioned event envelope validated with Zod
 * Java/Spring analogy: an Avro/JSON schema at the Kafka boundary; producer and consumer
 * must not trust the broker or each other.
 * Requirements:
 * - parseEventEnvelope validates schemaVersion=1, UUID ids, event type/aggregate type,
 *   ISO-8601 occurredAt, and a positive decimal amount with <=2 fraction digits.
 * - aggregateId must equal payload.transferId.
 * - Unknown fields are rejected; errors list paths, not payload values.
 * Hints:
 * - Use a discriminated/literal schema; validate payload separately.
 * - Keep money as a decimal string, never number.
 * Trap: trusting JSON.parse; accepting `eventType` from the broker as-is.
 * Run tests: npm run test:exercises -- --test-name-pattern="09-01"
 */

export type EventCurrency = 'USD' | 'EUR' | 'GBP';

export interface TransferCreatedPayload {
  readonly transferId: string;
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly amount: string;
  readonly currency: EventCurrency;
}

export interface EventEnvelope {
  readonly schemaVersion: 1;
  readonly eventId: string;
  readonly eventType: 'TransferCreated';
  readonly aggregateType: 'transfer';
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly payload: TransferCreatedPayload;
}

export class EventValidationError extends Error {
  public override readonly name = 'EventValidationError';
  public readonly code = 'EVENT_VALIDATION_ERROR';
  public readonly issues: readonly string[];

  public constructor(issues: readonly string[]) {
    super(`Invalid event:\n${issues.join('\n')}`);
    this.issues = issues;
  }
}

export function parseEventEnvelope(input: unknown): EventEnvelope {
  void input;
  throw new NotImplementedError('parseEventEnvelope');
}

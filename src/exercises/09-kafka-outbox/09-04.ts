import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 09-04
 * Topic: idempotent Kafka consumer handler keyed by eventId
 * Java/Spring analogy: a @KafkaListener + processed_events table; at-least-once delivery
 * means the same event can arrive again after a rebalance or failed offset commit.
 * Requirements:
 * - handleEventOnce returns 'duplicate' without calling the handler if eventId was seen.
 * - On first delivery, call handler then mark the event processed; return 'processed'.
 * - Handler failure must not mark the event; mark failure propagates (event will replay).
 * - Validate non-empty eventId.
 * Hints:
 * - The processed marker and business effect should be in the same DB transaction in prod.
 * - This exercise models the consumer-side idempotency check; store.claim can be stronger.
 * Trap: acknowledging before side effects; marking before handler succeeds.
 * Run tests: npm run test:exercises -- --test-name-pattern="09-04"
 */

export interface ConsumableEvent {
  readonly eventId: string;
}

export interface ProcessedEventStore {
  has(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

export type ConsumeOutcome = 'processed' | 'duplicate';

export async function handleEventOnce<TResult>(
  store: ProcessedEventStore,
  event: ConsumableEvent,
  handler: (event: ConsumableEvent) => Promise<TResult>,
): Promise<ConsumeOutcome> {
  void store;
  void event;
  void handler;
  throw new NotImplementedError('handleEventOnce');
}

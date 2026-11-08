import { NotImplementedError } from '../../shared/not-implemented.js';
import type { OutboxEventRecord } from './09-02.js';

/**
 * Exercise 09-06
 * Topic: one outbox poller tick: claim -> publish with retry -> mark
 * Java/Spring analogy: a scheduled outbox publisher; Kafka is not the source of truth and
 * a failed publish must leave the row unpublished for the next tick.
 * Requirements:
 * - pollOutboxOnce claims one batch, publishes each event, and marks only successes.
 * - A failed event does not stop the rest of the batch; it contributes to failed count.
 * - Options: batchSize (default 50), maxAttempts/baseDelayMs/sleep passed to retry.
 * - Return claimed/published/failed counts.
 * Hints:
 * - Claim and mark are separate DB operations; keep them in the store port.
 * - `markPublished` must run only after publishWithRetry resolves.
 * Trap: marking before publish; aborting the whole batch on one poison event.
 * Run tests: npm run test:exercises -- --test-name-pattern="09-06"
 */

export interface OutboxStorePort {
  claimUnpublished(limit: number): Promise<readonly OutboxEventRecord[]>;
  markPublished(eventId: string): Promise<void>;
}

export interface OutboxPublisherPort {
  publish(event: OutboxEventRecord): Promise<void>;
}

export interface PollOptions {
  readonly batchSize?: number;
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly sleep?: (delayMs: number) => Promise<void>;
}

export interface PollResult {
  readonly claimed: number;
  readonly published: number;
  readonly failed: number;
}

export async function pollOutboxOnce(
  store: OutboxStorePort,
  publisher: OutboxPublisherPort,
  options: PollOptions = {},
): Promise<PollResult> {
  void store;
  void publisher;
  void options;
  throw new NotImplementedError('pollOutboxOnce');
}

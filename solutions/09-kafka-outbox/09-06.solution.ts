import type { OutboxEventRecord } from '#src/exercises/09-kafka-outbox/09-02.js';
import { publishWithRetry } from '#src/exercises/09-kafka-outbox/09-03.js';

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
  const batchSize = options.batchSize ?? 50;
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError(`batchSize must be an integer >= 1: ${batchSize}`);
  }

  const events = await store.claimUnpublished(batchSize);
  let published = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await publishWithRetry(publisher, event, {
        ...(options.maxAttempts === undefined ? {} : { maxAttempts: options.maxAttempts }),
        ...(options.baseDelayMs === undefined ? {} : { baseDelayMs: options.baseDelayMs }),
        ...(options.sleep === undefined ? {} : { sleep: options.sleep }),
      });
      await store.markPublished(event.id);
      published += 1;
    } catch {
      failed += 1;
    }
  }

  return { claimed: events.length, published, failed };
}

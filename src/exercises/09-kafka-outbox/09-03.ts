import { NotImplementedError } from '../../shared/not-implemented.js';
import type { OutboxEventRecord } from './09-02.js';

/**
 * Exercise 09-03
 * Topic: bounded retry with exponential backoff for outbox publication
 * Java/Spring analogy: Spring Retry/Resilience4j, but the loop and delay policy are
 * explicit; Kafka producer retries alone do not cover a down broker or a bad event.
 * Requirements:
 * - publishWithRetry attempts at most maxAttempts (default 3).
 * - Delays are exponential: baseDelayMs, 2*base, 4*base... (default base 100ms).
 * - Success returns; final failure throws the last error.
 * - maxAttempts integer >= 1; baseDelayMs integer >= 0; sleep is injectable.
 * Hints:
 * - Sleep only between attempts, never after the last failure.
 * - Normalize non-Error throws.
 * Trap: infinite retry loop; retrying a non-retryable validation error forever.
 * Run tests: npm run test:exercises -- --test-name-pattern="09-03"
 */

export interface EventPublisherPort {
  publish(event: OutboxEventRecord): Promise<void>;
}

export interface PublishRetryOptions {
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly sleep?: (delayMs: number) => Promise<void>;
}

function defaultSleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function publishWithRetry(
  publisher: EventPublisherPort,
  event: OutboxEventRecord,
  options: PublishRetryOptions = {},
): Promise<void> {
  void publisher;
  void event;
  void options;
  throw new NotImplementedError('publishWithRetry');
}

export { defaultSleep };

import type { OutboxEventRecord } from '#src/exercises/09-kafka-outbox/09-02.js';

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

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  return new Error(typeof value === 'string' ? value : 'Event publication failed');
}

export async function publishWithRetry(
  publisher: EventPublisherPort,
  event: OutboxEventRecord,
  options: PublishRetryOptions = {},
): Promise<void> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const sleep = options.sleep ?? defaultSleep;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError(`maxAttempts must be an integer >= 1: ${maxAttempts}`);
  }
  if (!Number.isInteger(baseDelayMs) || baseDelayMs < 0) {
    throw new RangeError(`baseDelayMs must be an integer >= 0: ${baseDelayMs}`);
  }

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await publisher.publish(event);
      return;
    } catch (error) {
      lastError = toError(error);
      if (attempt < maxAttempts) {
        await sleep(baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError ?? new Error('Event publication failed');
}

export { defaultSleep };

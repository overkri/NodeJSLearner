import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 09-05
 * Topic: Kafka offset commit only after successful processing
 * Java/Spring analogy: ack-mode MANUAL/RECORD in Spring Kafka; offsets are strings and
 * the commit is the next offset (current + 1), not the current one.
 * Requirements:
 * - processKafkaMessage validates topic/partition/offset, calls handler, then commits
 *   offset+1 for the same topic/partition.
 * - Handler failure returns { status: 'retry' } and does not commit.
 * - Commit failure propagates (the message will be redelivered).
 * - Offsets may exceed Number.MAX_SAFE_INTEGER: use bigint arithmetic.
 * Hints:
 * - Kafka offset is a 64-bit value serialized as string.
 * - Commit only once; retry is the caller's loop (KafkaJS eachMessage).
 * Trap: commit before handler; parsing offset with Number; committing the current offset.
 * Run tests: npm run test:exercises -- --test-name-pattern="09-05"
 */

export interface KafkaMessage {
  readonly topic: string;
  readonly partition: number;
  readonly offset: string;
  readonly value: Buffer | null;
}

export interface OffsetCommitter {
  commit(offset: {
    readonly topic: string;
    readonly partition: number;
    readonly offset: string;
  }): Promise<void>;
}

export interface ProcessOutcome {
  readonly status: 'committed' | 'retry';
  readonly error?: Error;
}

export async function processKafkaMessage(
  message: KafkaMessage,
  handler: (value: Buffer | null) => Promise<void>,
  committer: OffsetCommitter,
): Promise<ProcessOutcome> {
  void message;
  void handler;
  void committer;
  throw new NotImplementedError('processKafkaMessage');
}

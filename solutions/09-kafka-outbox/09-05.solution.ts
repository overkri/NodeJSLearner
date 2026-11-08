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

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export async function processKafkaMessage(
  message: KafkaMessage,
  handler: (value: Buffer | null) => Promise<void>,
  committer: OffsetCommitter,
): Promise<ProcessOutcome> {
  if (message.topic.trim() === '') {
    throw new Error('Kafka topic must be non-empty');
  }
  if (!Number.isInteger(message.partition) || message.partition < 0) {
    throw new Error(`Invalid partition: ${message.partition}`);
  }
  if (!/^\d+$/.test(message.offset)) {
    throw new Error(`Invalid Kafka offset: ${message.offset}`);
  }

  const nextOffset = (BigInt(message.offset) + 1n).toString();

  try {
    await handler(message.value);
  } catch (error) {
    return { status: 'retry', error: toError(error) };
  }

  await committer.commit({
    topic: message.topic,
    partition: message.partition,
    offset: nextOffset,
  });
  return { status: 'committed' };
}

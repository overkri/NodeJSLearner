import { Kafka, logLevel, type Consumer, type Producer } from 'kafkajs';
import type { EventPublisher } from '#src/application/ports/event-bus.js';
import type { OutboxEvent } from '#src/application/ports/outbox-repository.js';
import { parseEventEnvelope, type EventEnvelope } from '#src/exercises/09-kafka-outbox/09-01.js';

export interface KafkaConnectionOptions {
  readonly clientId: string;
  readonly brokers: readonly string[];
}

export function createKafka(options: KafkaConnectionOptions): Kafka {
  return new Kafka({
    clientId: options.clientId,
    brokers: [...options.brokers],
    logLevel: logLevel.NOTHING,
  });
}

export interface KafkaPublisherOptions {
  readonly kafka: Kafka;
  readonly topic: string;
}

export interface KafkaPublisher extends EventPublisher {
  connect(): Promise<void>;
}

export interface KafkaConsumerOptions {
  readonly kafka: Kafka;
  readonly groupId: string;
  readonly topic: string;
}

export interface KafkaEnvelopeConsumer {
  connect(): Promise<void>;
  start(handler: (event: EventEnvelope) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

function toEnvelope(event: OutboxEvent): EventEnvelope {
  return parseEventEnvelope({
    schemaVersion: 1,
    eventId: event.id,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    occurredAt:
      event.createdAt instanceof Date ? event.createdAt.toISOString() : String(event.createdAt),
    payload: event.payload,
  });
}

export function createKafkaPublisher(options: KafkaPublisherOptions): KafkaPublisher {
  const producer: Producer = options.kafka.producer({ allowAutoTopicCreation: false });
  let connected = false;

  const connect = async (): Promise<void> => {
    if (!connected) {
      await producer.connect();
      connected = true;
    }
  };

  return {
    connect,
    async publish(event: OutboxEvent): Promise<void> {
      await connect();
      const envelope = toEnvelope(event);
      await producer.send({
        topic: options.topic,
        messages: [
          {
            key: envelope.aggregateId,
            value: JSON.stringify(envelope),
            headers: { 'content-type': 'application/json' },
          },
        ],
      });
    },
    async close(): Promise<void> {
      if (connected) {
        await producer.disconnect();
        connected = false;
      }
    },
  };
}

export function createKafkaConsumer(options: KafkaConsumerOptions): KafkaEnvelopeConsumer {
  const consumer: Consumer = options.kafka.consumer({ groupId: options.groupId });
  let running = false;

  const connect = async (): Promise<void> => {
    if (!running) {
      await consumer.connect();
      await consumer.subscribe({ topic: options.topic, fromBeginning: false });
      running = true;
    }
  };

  return {
    connect,
    async start(handler: (event: EventEnvelope) => Promise<void>): Promise<void> {
      await connect();
      await consumer.run({
        autoCommit: false,
        eachMessage: async ({ topic, partition, message }) => {
          if (message.value === null) {
            return;
          }
          const envelope = parseEventEnvelope(
            JSON.parse(message.value.toString('utf8')) as unknown,
          );
          await handler(envelope);
          await consumer.commitOffsets([
            { topic, partition, offset: (BigInt(message.offset) + 1n).toString() },
          ]);
        },
      });
    },
    async close(): Promise<void> {
      if (running) {
        await consumer.disconnect();
        running = false;
      }
    },
  };
}

export type { EventEnvelope };

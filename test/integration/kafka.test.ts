import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import type { OutboxEvent } from '../../src/application/ports/outbox-repository.js';
import {
  createKafka,
  createKafkaConsumer,
  createKafkaPublisher,
  type EventEnvelope,
} from '../../src/infrastructure/kafka/client.js';

const enabled = process.env['RUN_INTEGRATION_TESTS'] === 'true';

void test(
  'integration: KafkaJS producer -> consumer roundtrip',
  { skip: !enabled, timeout: 30_000 },
  async () => {
    const brokers = (process.env['KAFKA_BROKERS'] ?? '')
      .split(',')
      .map((broker) => broker.trim())
      .filter((broker) => broker !== '');
    assert.ok(brokers.length > 0, 'KAFKA_BROKERS must be set');

    const topic = `ledger.test.${randomUUID()}`;
    const groupId = `ledger.test.group.${randomUUID()}`;
    const kafka = createKafka({ clientId: 'ledger-integration', brokers });
    const admin = kafka.admin();
    const consumer = createKafkaConsumer({ kafka, groupId, topic });
    const publisher = createKafkaPublisher({ kafka, topic });

    try {
      await admin.connect();
      await admin.createTopics({
        topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
        waitForLeaders: true,
      });

      const received = new Promise<EventEnvelope>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Kafka message timeout')), 15_000);
        void consumer
          .start(async (event) => {
            clearTimeout(timer);
            resolve(event);
          })
          .catch((error: unknown) => {
            clearTimeout(timer);
            reject(error instanceof Error ? error : new Error(String(error)));
          });
      });

      await publisher.connect();
      const transferId = randomUUID();
      const event: OutboxEvent = {
        id: randomUUID(),
        aggregateType: 'transfer',
        aggregateId: transferId,
        eventType: 'TransferCreated',
        payload: {
          transferId,
          fromAccountId: '00000000-0000-4000-8000-000000000002',
          toAccountId: '00000000-0000-4000-8000-000000000003',
          amount: '10.50',
          currency: 'USD',
        },
        createdAt: new Date(),
        publishedAt: null,
        attempts: 0,
      };
      await publisher.publish(event);

      const envelope = await received;
      assert.equal(envelope.eventId, event.id);
      assert.equal(envelope.eventType, 'TransferCreated');
      assert.equal(envelope.payload.transferId, event.aggregateId);
    } finally {
      await publisher.close();
      await consumer.close();
      await admin.deleteTopics({ topics: [topic] }).catch(() => undefined);
      await admin.disconnect().catch(() => undefined);
    }
  },
);

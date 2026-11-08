import type { OutboxEvent } from './outbox-repository.js';

export interface EventPublisher {
  publish(event: OutboxEvent): Promise<void>;
  close(): Promise<void>;
}

export interface EventConsumer {
  start(handler: (event: OutboxEvent) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

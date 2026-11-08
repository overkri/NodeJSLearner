import type { DomainEvent } from '../../domain/events.js';
import type { TransactionContext } from './account-repository.js';

export interface OutboxEvent {
  readonly id: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: unknown;
  readonly createdAt: Date;
  readonly publishedAt: Date | null;
  readonly attempts: number;
}

export interface OutboxRepository {
  enqueue(event: DomainEvent, tx: TransactionContext): Promise<void>;
  claimUnpublished(limit: number): Promise<readonly OutboxEvent[]>;
  markPublished(id: string): Promise<void>;
  markFailed(id: string): Promise<void>;
}

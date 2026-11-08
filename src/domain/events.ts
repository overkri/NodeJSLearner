import type { TransferId } from './transfer.js';

export interface TransferCreatedPayload {
  readonly transferId: TransferId;
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly amountMinor: string;
  readonly currency: string;
}

export interface DomainEvent<TPayload = unknown> {
  readonly eventId: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: TPayload;
  readonly occurredAt: Date;
}

export type TransferCreatedEvent = DomainEvent<TransferCreatedPayload>;

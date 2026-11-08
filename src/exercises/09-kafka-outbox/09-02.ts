import { NotImplementedError } from '../../shared/not-implemented.js';
import type { DomainEvent } from '../../domain/events.js';

/**
 * Exercise 09-02
 * Topic: transactional outbox enqueue and claim (FOR UPDATE SKIP LOCKED)
 * Java/Spring analogy: a Debezium-style outbox table, but the poller is explicit SQL;
 * the event is inserted in the same transaction as the transfer.
 * Requirements:
 * - enqueueOutbox inserts id/aggregate/type/payload/created_at with parameterized SQL.
 * - claimOutboxBatch atomically claims unpublished rows, increments attempts, and uses
 *   FOR UPDATE SKIP LOCKED so multiple publishers can run safely.
 * - Map pg rows to OutboxEventRecord (payload jsonb, dates, attempts).
 * - limit is an integer 1..1000; empty/no rows -> [].
 * Hints:
 * - `UPDATE ... WHERE id IN (SELECT ... LIMIT $1 FOR UPDATE SKIP LOCKED) RETURNING *`.
 * - jsonb may arrive as an object; handle a JSON string defensively.
 * Trap: SELECT then UPDATE in separate statements; two pollers duplicate events.
 * Run tests: npm run test:exercises -- --test-name-pattern="09-02"
 */

export interface QueryResultLike {
  readonly rows: readonly unknown[];
}

export interface Queryable {
  query(sql: string, params?: readonly unknown[]): Promise<QueryResultLike>;
}

export interface OutboxEventRecord {
  readonly id: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: unknown;
  readonly createdAt: Date;
  readonly publishedAt: Date | null;
  readonly attempts: number;
}

export interface OutboxRow {
  readonly id: string;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly event_type: string;
  readonly payload: unknown;
  readonly created_at: Date | string;
  readonly published_at: Date | string | null;
  readonly attempts: number | string;
}

export const ENQUEUE_OUTBOX_SQL =
  'INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, created_at) ' +
  'VALUES ($1, $2, $3, $4, $5, $6)';

export const CLAIM_OUTBOX_SQL =
  'UPDATE outbox_events SET attempts = attempts + 1 ' +
  'WHERE id IN (SELECT id FROM outbox_events WHERE published_at IS NULL ' +
  'ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED) ' +
  'RETURNING id, aggregate_type, aggregate_id, event_type, payload, created_at, published_at, attempts';

export async function enqueueOutbox(transaction: Queryable, event: DomainEvent): Promise<void> {
  void transaction;
  void event;
  throw new NotImplementedError('enqueueOutbox');
}

export async function claimOutboxBatch(
  transaction: Queryable,
  limit: number,
): Promise<readonly OutboxEventRecord[]> {
  void transaction;
  void limit;
  throw new NotImplementedError('claimOutboxBatch');
}

export async function markOutboxPublished(transaction: Queryable, eventId: string): Promise<void> {
  void transaction;
  void eventId;
  throw new NotImplementedError('markOutboxPublished');
}

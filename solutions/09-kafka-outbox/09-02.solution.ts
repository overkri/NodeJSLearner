import type { DomainEvent } from '#src/domain/events.js';

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

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toPayload(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  return value;
}

function mapRow(row: OutboxRow): OutboxEventRecord {
  return {
    id: row.id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    payload: toPayload(row.payload),
    createdAt: toDate(row.created_at),
    publishedAt: row.published_at === null ? null : toDate(row.published_at),
    attempts: Number(row.attempts),
  };
}

export async function enqueueOutbox(transaction: Queryable, event: DomainEvent): Promise<void> {
  await transaction.query(ENQUEUE_OUTBOX_SQL, [
    event.eventId,
    event.aggregateType,
    event.aggregateId,
    event.eventType,
    JSON.stringify(event.payload),
    event.occurredAt,
  ]);
}

export async function claimOutboxBatch(
  transaction: Queryable,
  limit: number,
): Promise<readonly OutboxEventRecord[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
    throw new RangeError(`limit must be an integer 1..1000: ${limit}`);
  }
  const result = await transaction.query(CLAIM_OUTBOX_SQL, [limit]);
  return result.rows.map((row) => mapRow(row as OutboxRow));
}

export async function markOutboxPublished(transaction: Queryable, eventId: string): Promise<void> {
  await transaction.query('UPDATE outbox_events SET published_at = now() WHERE id = $1', [eventId]);
}

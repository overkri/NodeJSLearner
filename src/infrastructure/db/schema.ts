import { sql } from 'drizzle-orm';
import {
  bigint,
  char,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('customers_email_uq').on(table.email)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    currency: char('currency', { length: 3 }).notNull(),
    status: text('status').notNull().default('active'),
    balanceMinor: bigint('balance_minor', { mode: 'bigint' }).notNull().default(0n),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('accounts_customer_id_idx').on(table.customerId),
    index('accounts_status_idx').on(table.status),
  ],
);

export const transfers = pgTable(
  'transfers',
  {
    id: uuid('id').primaryKey(),
    fromAccountId: uuid('from_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    toAccountId: uuid('to_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    status: text('status').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('transfers_idempotency_key_uq').on(table.idempotencyKey),
    index('transfers_from_created_idx').on(table.fromAccountId, table.createdAt),
    index('transfers_to_created_idx').on(table.toAccountId, table.createdAt),
  ],
);

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey(),
    transferId: uuid('transfer_id')
      .notNull()
      .references(() => transfers.id, { onDelete: 'restrict' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    direction: text('direction').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ledger_entries_account_created_idx').on(table.accountId, table.createdAt),
    index('ledger_entries_transfer_idx').on(table.transferId),
  ],
);

export const idempotencyRecords = pgTable('idempotency_records', {
  key: text('key').primaryKey(),
  requestHash: text('request_hash').notNull(),
  responseJson: jsonb('response_json').$type<unknown>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
  },
  (table) => [
    index('outbox_events_unpublished_idx')
      .on(table.createdAt)
      .where(sql`published_at IS NULL`),
    index('outbox_events_aggregate_idx').on(table.aggregateType, table.aggregateId),
  ],
);

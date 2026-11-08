import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { getTableName } from 'drizzle-orm';
import * as schema from '../../src/infrastructure/db/schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

void test('Drizzle schema declares the ledger tables', () => {
  assert.equal(getTableName(schema.customers), 'customers');
  assert.equal(getTableName(schema.accounts), 'accounts');
  assert.equal(getTableName(schema.transfers), 'transfers');
  assert.equal(getTableName(schema.ledgerEntries), 'ledger_entries');
  assert.equal(getTableName(schema.idempotencyRecords), 'idempotency_records');
  assert.equal(getTableName(schema.outboxEvents), 'outbox_events');
});

void test('SQL migrations contain the critical constraints and indexes', async () => {
  const init = await readFile(path.join(root, 'migrations', '0001_init.sql'), 'utf8');
  const indexes = await readFile(path.join(root, 'migrations', '0002_indexes.sql'), 'utf8');

  assert.match(init, /CREATE TABLE customers/);
  assert.match(init, /CREATE TABLE ledger_entries/);
  assert.match(init, /transfers_idempotency_key_uq UNIQUE/);
  assert.match(init, /ledger_entries_direction_chk CHECK/);
  assert.match(init, /outbox_events/);
  assert.match(indexes, /ledger_entries_account_created_idx/);
  assert.match(indexes, /WHERE published_at IS NULL/);
});

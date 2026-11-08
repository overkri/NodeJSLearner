import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Pool, type PoolClient } from 'pg';

const enabled = process.env['RUN_INTEGRATION_TESTS'] === 'true';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function applyMigrations(client: PoolClient, schema: string): Promise<void> {
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  for (const file of ['0001_init.sql', '0002_indexes.sql']) {
    const sql = await readFile(path.join(root, 'migrations', file), 'utf8');
    await client.query(sql);
  }
}

async function transfer(
  client: PoolClient,
  fromId: string,
  toId: string,
  amountMinor: bigint,
): Promise<void> {
  await client.query('BEGIN');
  try {
    const locked = await client.query<{ id: string; balance_minor: string }>(
      'SELECT id, balance_minor FROM accounts WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE',
      [[fromId, toId].sort()],
    );
    assert.equal(locked.rows.length, 2);
    const source = locked.rows.find((row) => row.id === fromId);
    assert.ok(source);
    assert.ok(BigInt(source.balance_minor) >= amountMinor);

    await client.query('UPDATE accounts SET balance_minor = balance_minor - $2 WHERE id = $1', [
      fromId,
      amountMinor.toString(),
    ]);
    await client.query('UPDATE accounts SET balance_minor = balance_minor + $2 WHERE id = $1', [
      toId,
      amountMinor.toString(),
    ]);
    const transferId = randomUUID();
    await client.query(
      'INSERT INTO transfers (id, from_account_id, to_account_id, amount_minor, currency, status, idempotency_key, request_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [transferId, fromId, toId, amountMinor.toString(), 'USD', 'completed', randomUUID(), 'hash'],
    );
    await client.query(
      'INSERT INTO ledger_entries (id, transfer_id, account_id, direction, amount_minor) VALUES ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10)',
      [
        randomUUID(),
        transferId,
        fromId,
        'debit',
        amountMinor.toString(),
        randomUUID(),
        transferId,
        toId,
        'credit',
        amountMinor.toString(),
      ],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

void test(
  'integration: PostgreSQL transfer, lock ordering and rollback',
  { skip: !enabled, timeout: 30_000 },
  async () => {
    const connectionString = process.env['DATABASE_URL'];
    assert.ok(connectionString, 'DATABASE_URL must be set');

    const pool = new Pool({ connectionString, max: 4 });
    const schema = `it_${randomUUID().replaceAll('-', '_')}`;
    const customerId = randomUUID();
    const fromId = randomUUID();
    const toId = randomUUID();

    try {
      const setup = await pool.connect();
      try {
        await applyMigrations(setup, schema);
        await setup.query('INSERT INTO customers (id, email) VALUES ($1, $2)', [
          customerId,
          `${customerId}@example.test`,
        ]);
        await setup.query(
          'INSERT INTO accounts (id, customer_id, currency, balance_minor) VALUES ($1,$2,$3,$4), ($5,$2,$3,$6)',
          [fromId, customerId, 'USD', '1000', toId, '0'],
        );
      } finally {
        setup.release();
      }

      const client = await pool.connect();
      try {
        await client.query(`SET search_path TO ${schema}`);
        await transfer(client, fromId, toId, 250n);

        const balances = await client.query<{ id: string; balance_minor: string }>(
          'SELECT id, balance_minor FROM accounts ORDER BY id',
        );
        assert.equal(balances.rows.find((row) => row.id === fromId)?.balance_minor, '750');
        assert.equal(balances.rows.find((row) => row.id === toId)?.balance_minor, '250');

        await assert.rejects(transfer(client, fromId, toId, 10_000n), /assert/i);

        const afterRollback = await client.query<{ balance_minor: string }>(
          'SELECT balance_minor FROM accounts WHERE id = $1',
          [fromId],
        );
        assert.equal(afterRollback.rows[0]?.balance_minor, '750');

        const key = randomUUID();
        await client.query(
          'INSERT INTO transfers (id, from_account_id, to_account_id, amount_minor, currency, status, idempotency_key, request_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [randomUUID(), fromId, toId, '1', 'USD', 'completed', key, 'hash'],
        );
        await assert.rejects(
          client.query(
            'INSERT INTO transfers (id, from_account_id, to_account_id, amount_minor, currency, status, idempotency_key, request_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
            [randomUUID(), fromId, toId, '1', 'USD', 'completed', key, 'hash'],
          ),
          (error: unknown) =>
            typeof error === 'object' &&
            error !== null &&
            (error as { code?: string }).code === '23505',
        );
      } finally {
        client.release();
      }
    } finally {
      await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => undefined);
      await pool.end();
    }
  },
);

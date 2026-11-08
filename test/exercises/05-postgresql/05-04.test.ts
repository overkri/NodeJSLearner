import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import {
  LOCK_QUERY,
  lockAccountsInOrder,
  type AccountRow,
} from '../../../src/exercises/05-postgresql/05-04.js';

exerciseTest('05-04 lockAccountsInOrder deduplicates and sorts before locking', async () => {
  const calls: Array<{ sql: string; params: readonly unknown[] | undefined }> = [];
  const rows: AccountRow[] = [
    {
      id: 'a',
      customer_id: 'c1',
      currency: 'USD',
      status: 'active',
      balance_minor: '123',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'b',
      customer_id: 'c2',
      currency: 'EUR',
      status: 'frozen',
      balance_minor: 5n,
      created_at: new Date('2026-01-02T00:00:00.000Z'),
    },
  ];

  const accounts = await lockAccountsInOrder(
    {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows };
      },
    },
    ['b', 'a', 'b'],
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.sql, LOCK_QUERY);
  assert.match(LOCK_QUERY, /ORDER BY id FOR UPDATE/);
  assert.deepEqual(calls[0]?.params, [['a', 'b']]);
  assert.equal(accounts[0]?.id, 'a');
  assert.equal(accounts[0]?.balanceMinor, 123n);
  assert.equal(accounts[1]?.balanceMinor, 5n);
  assert.equal(accounts[1]?.status, 'frozen');
  assert.ok(accounts[1]?.createdAt instanceof Date);
});

exerciseTest('05-04 lockAccountsInOrder skips the query for empty ids', async () => {
  let calls = 0;
  const accounts = await lockAccountsInOrder(
    {
      async query() {
        calls += 1;
        return { rows: [] };
      },
    },
    [],
  );

  assert.deepEqual(accounts, []);
  assert.equal(calls, 0);
});

exerciseTest('05-04 lockAccountsInOrder returns only rows the database locked', async () => {
  const accounts = await lockAccountsInOrder(
    {
      async query() {
        return {
          rows: [
            {
              id: 'a',
              customer_id: 'c1',
              currency: 'USD',
              status: 'active',
              balance_minor: '0',
              created_at: new Date(),
            },
          ],
        };
      },
    },
    ['a', 'missing'],
  );

  assert.equal(accounts.length, 1);
  assert.equal(accounts[0]?.id, 'a');
});

import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  INSERT_LEDGER_ENTRIES_SQL,
  insertLedgerEntries,
  type LedgerEntryInsert,
} from '../../../src/exercises/05-postgresql/05-05.js';

function entry(overrides: Partial<LedgerEntryInsert> = {}): LedgerEntryInsert {
  return {
    id: 'entry-1',
    transferId: 'transfer-1',
    accountId: 'account-a',
    direction: 'debit',
    amountMinor: 100n,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

exerciseTest('05-05 insertLedgerEntries uses one UNNEST query', async () => {
  const calls: Array<{ sql: string; params: readonly unknown[] | undefined }> = [];
  const entries = [entry(), entry({ id: 'entry-2', accountId: 'account-b', direction: 'credit' })];

  const count = await insertLedgerEntries(
    {
      async query(sql, params) {
        calls.push({ sql, params });
        return { rows: [{ id: 'entry-1' }, { id: 'entry-2' }] };
      },
    },
    entries,
  );

  assert.equal(count, 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.sql, INSERT_LEDGER_ENTRIES_SQL);
  assert.match(INSERT_LEDGER_ENTRIES_SQL, /UNNEST/);
  assert.deepEqual(calls[0]?.params, [
    ['entry-1', 'entry-2'],
    ['transfer-1', 'transfer-1'],
    ['account-a', 'account-b'],
    ['debit', 'credit'],
    [100n, 100n],
    [new Date('2026-01-01T00:00:00.000Z'), new Date('2026-01-01T00:00:00.000Z')],
  ]);
});

exerciseTest('05-05 insertLedgerEntries skips empty input', async () => {
  let calls = 0;
  const count = await insertLedgerEntries(
    {
      async query() {
        calls += 1;
        return { rows: [] };
      },
    },
    [],
  );

  assert.equal(count, 0);
  assert.equal(calls, 0);
});

exerciseTest('05-05 insertLedgerEntries validates before querying', async () => {
  let calls = 0;
  const transaction = {
    async query() {
      calls += 1;
      return { rows: [] };
    },
  };

  await expectRejects(
    insertLedgerEntries(transaction, [entry({ amountMinor: 0n })]),
    /must be positive/,
  );
  await expectRejects(
    insertLedgerEntries(transaction, [
      entry({ direction: 'sideways' as LedgerEntryInsert['direction'] }),
    ]),
    /Invalid ledger direction/,
  );
  assert.equal(calls, 0);
});

import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  loadEntriesByAccount,
  type EntryRecord,
} from '../../../src/exercises/05-postgresql/05-06.js';

function entry(accountId: string, id: string): EntryRecord {
  return {
    accountId,
    id,
    amountMinor: 1n,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

exerciseTest(
  '05-06 loadEntriesByAccount performs one query per chunk, not per account',
  async () => {
    const calls: string[][] = [];
    const ids = Array.from({ length: 250 }, (_, index) => `account-${index}`);

    const result = await loadEntriesByAccount(ids, async (chunk) => {
      calls.push([...chunk]);
      return chunk.map((accountId) => entry(accountId, `entry-${accountId}`));
    });

    assert.equal(calls.length, 3);
    assert.deepEqual(
      calls.map((chunk) => chunk.length),
      [100, 100, 50],
    );
    assert.equal(result.size, 250);
    assert.equal(result.get('account-249')?.[0]?.id, 'entry-account-249');
  },
);

exerciseTest('05-06 loadEntriesByAccount deduplicates ids and preserves row order', async () => {
  const calls: string[][] = [];
  const result = await loadEntriesByAccount(
    ['b', 'a', 'b', 'c'],
    async (chunk) => {
      calls.push([...chunk]);
      return [entry('a', 'a-2'), entry('a', 'a-1'), entry('b', 'b-1'), entry('unknown', 'x-1')];
    },
    { batchSize: 10 },
  );

  assert.deepEqual(calls, [['b', 'a', 'c']]);
  assert.deepEqual(
    result.get('a')?.map((row) => row.id),
    ['a-2', 'a-1'],
  );
  assert.deepEqual(result.get('c'), []);
  assert.equal(result.has('unknown'), false);
});

exerciseTest('05-06 loadEntriesByAccount handles empty input and validates batchSize', async () => {
  let calls = 0;
  const empty = await loadEntriesByAccount([], async () => {
    calls += 1;
    return [];
  });
  assert.equal(empty.size, 0);
  assert.equal(calls, 0);

  await expectRejects(
    loadEntriesByAccount(['a'], async () => [], { batchSize: 0 }),
    RangeError,
  );
});

exerciseTest('05-06 loadEntriesByAccount propagates fetcher errors', async () => {
  await expectRejects(
    loadEntriesByAccount(['a'], async () => {
      throw new Error('batch failed');
    }),
    /batch failed/,
  );
});

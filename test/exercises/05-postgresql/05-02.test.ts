import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  runInTransaction,
  type QueryResultLike,
  type TransactionClient,
} from '../../../src/exercises/05-postgresql/05-02.js';

interface FakeOptions {
  readonly failOn?: string;
  readonly releaseError?: Error;
  readonly rowsBySql?: Readonly<Record<string, readonly unknown[]>>;
}

function makeClient(options: FakeOptions = {}): {
  client: TransactionClient;
  queries: string[];
  releases: Array<Error | boolean | undefined>;
} {
  const queries: string[] = [];
  const releases: Array<Error | boolean | undefined> = [];
  const client: TransactionClient = {
    async query(sql: string): Promise<QueryResultLike> {
      queries.push(sql);
      if (options.failOn === sql) {
        throw new Error(`${sql} failed`);
      }
      return { rows: options.rowsBySql?.[sql] ?? [] };
    },
    release(error?: Error | boolean): void {
      releases.push(error);
      if (options.releaseError !== undefined) {
        throw options.releaseError;
      }
    },
  };
  return { client, queries, releases };
}

exerciseTest('05-02 runInTransaction commits and releases without error', async () => {
  const { client, queries, releases } = makeClient({
    rowsBySql: { 'SELECT 1': [{ value: 1 }] },
  });

  const result = await runInTransaction(
    { connect: async () => client },
    async (tx) => (await tx.query('SELECT 1')).rows.length,
  );

  assert.equal(result, 1);
  assert.deepEqual(queries, ['BEGIN', 'SELECT 1', 'COMMIT']);
  assert.deepEqual(releases, [undefined]);
});

exerciseTest('05-02 work failure rolls back and preserves the original error', async () => {
  const { client, queries, releases } = makeClient({ failOn: 'ROLLBACK' });

  await expectRejects(
    runInTransaction({ connect: async () => client }, async () => {
      throw new Error('work failed');
    }),
    /work failed/,
  );

  assert.deepEqual(queries, ['BEGIN', 'ROLLBACK']);
  assert.equal(releases.length, 1);
  assert.ok(releases[0] instanceof Error);
});

exerciseTest('05-02 BEGIN failure does not roll back', async () => {
  const { client, queries, releases } = makeClient({ failOn: 'BEGIN' });

  await expectRejects(
    runInTransaction({ connect: async () => client }, async () => 'never'),
    /BEGIN failed/,
  );

  assert.deepEqual(queries, ['BEGIN']);
  assert.equal(releases.length, 1);
  assert.ok(releases[0] instanceof Error);
});

exerciseTest('05-02 COMMIT failure rolls back and propagates', async () => {
  const { client, queries, releases } = makeClient({ failOn: 'COMMIT' });

  await expectRejects(
    runInTransaction({ connect: async () => client }, async () => 'done'),
    /COMMIT failed/,
  );

  assert.deepEqual(queries, ['BEGIN', 'COMMIT', 'ROLLBACK']);
  assert.equal(releases.length, 1);
  assert.ok(releases[0] instanceof Error);
});

exerciseTest('05-02 release failure after success propagates', async () => {
  const { client } = makeClient({ releaseError: new Error('release failed') });

  await expectRejects(
    runInTransaction({ connect: async () => client }, async () => 'done'),
    /release failed/,
  );
});

exerciseTest('05-02 release failure does not mask the operation error', async () => {
  const { client } = makeClient({ releaseError: new Error('release failed') });

  await expectRejects(
    runInTransaction({ connect: async () => client }, async () => {
      throw new Error('operation failed');
    }),
    /operation failed/,
  );
});

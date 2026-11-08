import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 05-02
 * Topic: explicit transaction boundaries with pg
 * Java/Spring analogy: @Transactional proxy is gone; BEGIN/COMMIT/ROLLBACK and connection
 * release are visible. Nested calls are not automatically joined to one transaction.
 * Requirements:
 * - runInTransaction executes BEGIN, then work, then COMMIT.
 * - Any failure (BEGIN/work/COMMIT) rolls back when a transaction was started.
 * - release() is always called exactly once; release(error) on failure.
 * - The original operation error wins over rollback/release errors.
 * - release error after a successful commit propagates.
 * Hints:
 * - Track whether BEGIN succeeded before attempting ROLLBACK.
 * - Normalize non-Error throws; use finally for release.
 * Trap: implicit transaction per statement; forgetting release on COMMIT failure.
 * Run tests: npm run test:exercises -- --test-name-pattern="05-02"
 */

export interface QueryResultLike {
  readonly rows: readonly unknown[];
}

export interface TransactionClient {
  query(sql: string, params?: readonly unknown[]): Promise<QueryResultLike>;
  release(error?: Error | boolean): void;
}

export interface TransactionPool {
  connect(): Promise<TransactionClient>;
}

export async function runInTransaction<TResult>(
  pool: TransactionPool,
  work: (client: TransactionClient) => Promise<TResult>,
): Promise<TResult> {
  void pool;
  void work;
  throw new NotImplementedError('runInTransaction');
}

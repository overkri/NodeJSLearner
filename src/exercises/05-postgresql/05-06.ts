import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 05-06
 * Topic: avoiding N+1 queries with a batched loader
 * Java/Spring analogy: a repository method with `WHERE account_id IN (...)` instead of
 * calling findByAccountId in a loop; no JPA batch fetching to save you.
 * Requirements:
 * - Deduplicate account ids, chunk them by batchSize (default 100).
 * - Call fetchBatch once per chunk, sequentially; never once per account.
 * - Return a Map with an entry (possibly empty array) for every requested account.
 * - Preserve row order within each account; ignore rows for unrequested accounts.
 * - Empty input returns an empty Map without calling fetchBatch.
 * Hints:
 * - A Map<string, Entry[]> is easy to group; dedupe ids first.
 * - Validate batchSize as an integer >= 1.
 * Trap: `for (const id of ids) await repo.findByAccount(id)` is N+1.
 * Run tests: npm run test:exercises -- --test-name-pattern="05-06"
 */

export interface EntryRecord {
  readonly accountId: string;
  readonly id: string;
  readonly amountMinor: bigint;
  readonly createdAt: Date;
}

export type BatchFetcher = (accountIds: readonly string[]) => Promise<readonly EntryRecord[]>;

export interface BatchOptions {
  readonly batchSize?: number;
}

export async function loadEntriesByAccount(
  accountIds: readonly string[],
  fetchBatch: BatchFetcher,
  options: BatchOptions = {},
): Promise<ReadonlyMap<string, readonly EntryRecord[]>> {
  void accountIds;
  void fetchBatch;
  void options;
  throw new NotImplementedError('loadEntriesByAccount');
}

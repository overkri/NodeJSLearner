import { NotImplementedError } from '../../shared/not-implemented.js';
import type { LedgerDirection } from '../../domain/transfer.js';

/**
 * Exercise 05-05
 * Topic: batch INSERT with UNNEST instead of N queries
 * Java/Spring analogy: JdbcTemplate.batchUpdate / saveAll, but here you control the SQL.
 * Two ledger rows must be written atomically with the transfer, not in a loop of awaits.
 * Requirements:
 * - Validate entries: non-empty, positive bigint amounts, direction debit|credit.
 * - Insert all entries with exactly one query using arrays and UNNEST.
 * - Preserve input order in the parameter arrays; return the number of entries.
 * - Empty input returns 0 without querying; invalid input queries nothing.
 * Hints:
 * - `INSERT ... SELECT * FROM UNNEST($1::uuid[], $2::uuid[], $3::text[], $4::bigint[], $5::timestamptz[])`.
 * - pg maps JS arrays to PostgreSQL arrays; bigint values must be bigint[].
 * Trap: `for (const entry of entries) await tx.query(...)` — N round trips and partial writes.
 * Run tests: npm run test:exercises -- --test-name-pattern="05-05"
 */

export interface LedgerEntryInsert {
  readonly id: string;
  readonly transferId: string;
  readonly accountId: string;
  readonly direction: LedgerDirection;
  readonly amountMinor: bigint;
  readonly createdAt: Date;
}

export interface QueryResultLike {
  readonly rows: readonly unknown[];
}

export interface Queryable {
  query(sql: string, params?: readonly unknown[]): Promise<QueryResultLike>;
}

export const INSERT_LEDGER_ENTRIES_SQL =
  'INSERT INTO ledger_entries (id, transfer_id, account_id, direction, amount_minor, created_at) ' +
  'SELECT * FROM UNNEST($1::uuid[], $2::uuid[], $3::uuid[], $4::text[], $5::bigint[], $6::timestamptz[]) ' +
  'RETURNING id';

export async function insertLedgerEntries(
  transaction: Queryable,
  entries: readonly LedgerEntryInsert[],
): Promise<number> {
  void transaction;
  void entries;
  throw new NotImplementedError('insertLedgerEntries');
}

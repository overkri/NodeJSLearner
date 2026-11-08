import type { LedgerDirection } from '#src/domain/transfer.js';
import { ValidationError } from '#src/domain/errors.js';

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
  if (entries.length === 0) {
    return 0;
  }

  for (const entry of entries) {
    if (entry.amountMinor <= 0n) {
      throw new ValidationError(`Ledger entry amount must be positive: ${entry.id}`);
    }
    if (entry.direction !== 'debit' && entry.direction !== 'credit') {
      throw new ValidationError(`Invalid ledger direction: ${String(entry.direction)}`);
    }
  }

  await transaction.query(INSERT_LEDGER_ENTRIES_SQL, [
    entries.map((entry) => entry.id),
    entries.map((entry) => entry.transferId),
    entries.map((entry) => entry.accountId),
    entries.map((entry) => entry.direction),
    entries.map((entry) => entry.amountMinor),
    entries.map((entry) => entry.createdAt),
  ]);

  return entries.length;
}

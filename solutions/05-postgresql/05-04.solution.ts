import type { Account } from '#src/domain/account.js';

export interface QueryResultLike {
  readonly rows: readonly unknown[];
}

export interface Queryable {
  query(sql: string, params?: readonly unknown[]): Promise<QueryResultLike>;
}

export interface AccountRow {
  readonly id: string;
  readonly customer_id: string;
  readonly currency: string;
  readonly status: string;
  readonly balance_minor: string | bigint;
  readonly created_at: Date | string;
}

const LOCK_QUERY =
  'SELECT id, customer_id, currency, status, balance_minor, created_at ' +
  'FROM accounts WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE';

function mapRow(row: AccountRow): Account {
  return {
    id: row.id,
    customerId: row.customer_id,
    currency: row.currency as Account['currency'],
    status: row.status as Account['status'],
    balanceMinor: BigInt(row.balance_minor),
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
  };
}

export async function lockAccountsInOrder(
  transaction: Queryable,
  ids: readonly string[],
): Promise<readonly Account[]> {
  const uniqueSorted = [...new Set(ids)].sort();
  if (uniqueSorted.length === 0) {
    return [];
  }

  const result = await transaction.query(LOCK_QUERY, [uniqueSorted]);
  return result.rows.map((row) => mapRow(row as AccountRow));
}

export { LOCK_QUERY };

import { NotImplementedError } from '../../shared/not-implemented.js';
import type { Account } from '../../domain/account.js';

/**
 * Exercise 05-04
 * Topic: SELECT ... FOR UPDATE with deterministic lock ordering
 * Java/Spring analogy: pessimistic locking in a @Transactional repository; deadlocks are
 * avoided by acquiring row locks in the same order across all transactions.
 * Requirements:
 * - Deduplicate account ids and sort them ascending before querying.
 * - Run one query: SELECT ... WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE.
 * - Map pg rows to Account: balance_minor -> bigint, created_at -> Date.
 * - Empty ids returns [] without touching the database.
 * Hints:
 * - `ORDER BY id` plus a sorted parameter array makes lock order deterministic.
 * - node-postgres returns int8 (bigint) as string by default.
 * Trap: locking in request order; missing rows silently treated as success.
 * Run tests: npm run test:exercises -- --test-name-pattern="05-04"
 */

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

export async function lockAccountsInOrder(
  transaction: Queryable,
  ids: readonly string[],
): Promise<readonly Account[]> {
  void transaction;
  void ids;
  throw new NotImplementedError('lockAccountsInOrder');
}

export { LOCK_QUERY };

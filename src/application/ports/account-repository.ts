import type { Account, AccountId } from '../../domain/account.js';

/** Opaque handle owned by the infrastructure transaction implementation. */
export interface TransactionContext {
  readonly id: string;
}

export interface AccountRepository {
  getByIdForUpdate(id: AccountId, tx: TransactionContext): Promise<Account | null>;
  updateBalance(id: AccountId, deltaMinor: bigint, tx: TransactionContext): Promise<void>;
}

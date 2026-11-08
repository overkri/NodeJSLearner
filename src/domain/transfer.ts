import type { AccountId, CustomerId } from './account.js';
import type { CurrencyCode } from './money.js';

export type TransferId = string;
export type TransferStatus = 'pending' | 'completed' | 'failed';
export type LedgerDirection = 'debit' | 'credit';

export interface TransferCommand {
  readonly fromAccountId: AccountId;
  readonly toAccountId: AccountId;
  readonly amountMinor: bigint;
  readonly currency: CurrencyCode;
  readonly idempotencyKey: string;
  readonly requestHash: string;
}

export interface TransferResult {
  readonly transferId: TransferId;
  readonly status: TransferStatus;
  readonly fromAccountId: AccountId;
  readonly toAccountId: AccountId;
  readonly amountMinor: bigint;
  readonly currency: CurrencyCode;
  readonly replayed: boolean;
}

export interface Transfer {
  readonly id: TransferId;
  readonly fromAccountId: AccountId;
  readonly toAccountId: AccountId;
  readonly amountMinor: bigint;
  readonly currency: CurrencyCode;
  readonly status: TransferStatus;
  readonly idempotencyKey: string;
  readonly requestHash: string;
  readonly createdAt: Date;
}

export interface LedgerEntry {
  readonly id: string;
  readonly transferId: TransferId;
  readonly accountId: AccountId;
  readonly direction: LedgerDirection;
  readonly amountMinor: bigint;
  readonly createdAt: Date;
}

export interface Customer {
  readonly id: CustomerId;
  readonly email: string;
  readonly createdAt: Date;
}

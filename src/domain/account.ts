import type { CurrencyCode } from './money.js';

export type AccountId = string;
export type CustomerId = string;

export type AccountStatus = 'active' | 'frozen' | 'closed';

export interface Account {
  readonly id: AccountId;
  readonly customerId: CustomerId;
  readonly currency: CurrencyCode;
  readonly status: AccountStatus;
  readonly balanceMinor: bigint;
  readonly createdAt: Date;
}

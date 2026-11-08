import type { Account } from '#src/domain/account.js';
import {
  AccountNotFoundError,
  CurrencyMismatchError,
  InsufficientFundsError,
  ValidationError,
} from '#src/domain/errors.js';
import type { LedgerDirection, TransferCommand } from '#src/domain/transfer.js';

export interface PlannedEntry {
  readonly accountId: string;
  readonly direction: LedgerDirection;
  readonly amountMinor: bigint;
}

export interface TransferPlan {
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly fromBalanceAfter: bigint;
  readonly toBalanceAfter: bigint;
  readonly entries: readonly PlannedEntry[];
}

function assertUsable(account: Account, role: 'source' | 'target'): void {
  if (account.status !== 'active') {
    throw new ValidationError(`${role} account is not active: ${account.status}`);
  }
}

export function planTransfer(
  accounts: { readonly from: Account | null; readonly to: Account | null },
  command: TransferCommand,
): TransferPlan {
  const { from, to } = accounts;
  if (from === null) {
    throw new AccountNotFoundError(command.fromAccountId);
  }
  if (to === null) {
    throw new AccountNotFoundError(command.toAccountId);
  }
  if (from.id === to.id) {
    throw new ValidationError('Source and target accounts must differ');
  }
  if (command.amountMinor <= 0n) {
    throw new ValidationError('Transfer amount must be positive');
  }
  if (command.currency !== from.currency) {
    throw new CurrencyMismatchError(from.currency, command.currency);
  }
  if (command.currency !== to.currency) {
    throw new CurrencyMismatchError(to.currency, command.currency);
  }
  assertUsable(from, 'source');
  assertUsable(to, 'target');
  if (from.balanceMinor < command.amountMinor) {
    throw new InsufficientFundsError(from.id);
  }

  return {
    fromAccountId: from.id,
    toAccountId: to.id,
    amountMinor: command.amountMinor,
    currency: from.currency,
    fromBalanceAfter: from.balanceMinor - command.amountMinor,
    toBalanceAfter: to.balanceMinor + command.amountMinor,
    entries: [
      { accountId: from.id, direction: 'debit', amountMinor: command.amountMinor },
      { accountId: to.id, direction: 'credit', amountMinor: command.amountMinor },
    ],
  };
}

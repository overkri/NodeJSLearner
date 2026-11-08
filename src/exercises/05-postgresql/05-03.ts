import { NotImplementedError } from '../../shared/not-implemented.js';
import type { Account } from '../../domain/account.js';
import type { LedgerDirection, TransferCommand } from '../../domain/transfer.js';

/**
 * Exercise 05-03
 * Topic: transfer invariants before SQL (amounts, status, currency, balance)
 * Java/Spring analogy: a domain service inside a @Transactional method, but the plan is
 * pure: it can be tested without a database and before locks/updates are applied.
 * Requirements:
 * - Both accounts are required and distinct; both must be active.
 * - Command currency equals both account currencies; amountMinor is positive.
 * - Source balance must be sufficient; no float, only bigint.
 * - Return balances after the transfer and exactly two ledger entries:
 *   debit source, credit target.
 * Hints:
 * - Validate in a deterministic order and use domain errors, not generic strings.
 * - Do not mutate the input accounts.
 * Trap: checking balance after some earlier side effect; using number for money.
 * Run tests: npm run test:exercises -- --test-name-pattern="05-03"
 */

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

export function planTransfer(
  accounts: { readonly from: Account | null; readonly to: Account | null },
  command: TransferCommand,
): TransferPlan {
  void accounts;
  void command;
  throw new NotImplementedError('planTransfer');
}

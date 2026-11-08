import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import type { Account } from '../../../src/domain/account.js';
import type { TransferCommand } from '../../../src/domain/transfer.js';
import { planTransfer } from '../../../src/exercises/05-postgresql/05-03.js';

function account(overrides: Partial<Account> = {}): Account {
  return {
    id: 'account-a',
    customerId: 'customer-1',
    currency: 'USD',
    status: 'active',
    balanceMinor: 1_000n,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function command(overrides: Partial<TransferCommand> = {}): TransferCommand {
  return {
    fromAccountId: 'account-a',
    toAccountId: 'account-b',
    amountMinor: 250n,
    currency: 'USD',
    idempotencyKey: 'key-1',
    requestHash: 'hash-1',
    ...overrides,
  };
}

exerciseTest('05-03 planTransfer computes balances and two entries', () => {
  const from = account();
  const to = account({ id: 'account-b', balanceMinor: 50n });
  const plan = planTransfer({ from, to }, command());

  assert.equal(plan.fromBalanceAfter, 750n);
  assert.equal(plan.toBalanceAfter, 300n);
  assert.deepEqual(plan.entries, [
    { accountId: 'account-a', direction: 'debit', amountMinor: 250n },
    { accountId: 'account-b', direction: 'credit', amountMinor: 250n },
  ]);
  assert.equal(from.balanceMinor, 1_000n);
  assert.equal(to.balanceMinor, 50n);
});

exerciseTest('05-03 planTransfer rejects missing, same, inactive and mismatched accounts', () => {
  const from = account();
  const to = account({ id: 'account-b' });

  expectThrows(() => planTransfer({ from: null, to }, command()), /Account not found/);
  expectThrows(
    () => planTransfer({ from, to: null }, command({ toAccountId: 'missing' })),
    /Account not found/,
  );
  expectThrows(
    () => planTransfer({ from, to: account({ id: 'account-a' }) }, command()),
    /must differ/,
  );
  expectThrows(
    () => planTransfer({ from, to: account({ id: 'account-b', status: 'frozen' }) }, command()),
    /not active/,
  );
  expectThrows(
    () => planTransfer({ from, to: account({ id: 'account-b', currency: 'EUR' }) }, command()),
    /Currency mismatch/,
  );
});

exerciseTest('05-03 planTransfer rejects non-positive amounts and insufficient funds', () => {
  const from = account();
  const to = account({ id: 'account-b' });

  expectThrows(() => planTransfer({ from, to }, command({ amountMinor: 0n })), /must be positive/);
  expectThrows(() => planTransfer({ from, to }, command({ amountMinor: -1n })), /must be positive/);
  expectThrows(
    () => planTransfer({ from, to }, command({ amountMinor: 1_001n })),
    /Insufficient funds/,
  );
});

exerciseTest('05-03 planTransfer allows spending the exact balance', () => {
  const from = account({ balanceMinor: 100n });
  const to = account({ id: 'account-b', balanceMinor: 0n });
  const plan = planTransfer({ from, to }, command({ amountMinor: 100n }));

  assert.equal(plan.fromBalanceAfter, 0n);
  assert.equal(plan.toBalanceAfter, 100n);
});

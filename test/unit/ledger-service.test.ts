import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LedgerService } from '../../src/application/ledger-service.js';
import type { Clock, IdGenerator } from '../../src/application/ports/clock.js';
import { IdempotencyConflictError } from '../../src/domain/errors.js';
import type { TransferCommand } from '../../src/domain/transfer.js';

class FixedClock implements Clock {
  private current = new Date('2026-11-08T10:00:00.000Z');
  public now(): Date {
    return new Date(this.current);
  }
}

class Ids implements IdGenerator {
  private counter = 0;
  public next(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

async function setup(): Promise<{
  ledger: LedgerService;
  fromId: string;
  toId: string;
}> {
  const ledger = new LedgerService(new FixedClock(), new Ids());
  const customer = await ledger.createCustomer('alice@example.test');
  const from = await ledger.createAccount(customer.id, 'USD');
  const to = await ledger.createAccount(customer.id, 'USD');
  await ledger.credit(from.id, 1_000n);
  return { ledger, fromId: from.id, toId: to.id };
}

function command(
  fromId: string,
  toId: string,
  overrides: Partial<TransferCommand> = {},
): TransferCommand {
  return {
    fromAccountId: fromId,
    toAccountId: toId,
    amountMinor: 250n,
    currency: 'USD',
    idempotencyKey: 'key-1',
    requestHash: 'hash-1',
    ...overrides,
  };
}

void test('LedgerService transfers money and writes ledger/outbox', async () => {
  const { ledger, fromId, toId } = await setup();

  const result = await ledger.transfer({
    ...command(fromId, toId, { amountMinor: 1_000n }),
    idempotencyKey: 'key-1',
  });

  assert.equal(result.replayed, false);
  assert.equal((await ledger.getAccount(fromId))?.balanceMinor, 0n);
  assert.equal((await ledger.getAccount(toId))?.balanceMinor, 1_000n);
  assert.equal((await ledger.listEntries(fromId)).length, 1);
  assert.equal((await ledger.listEntries(toId)).length, 1);
  assert.equal((await ledger.outboxEvents()).length, 1);
});

void test('LedgerService replays the same key and rejects a changed payload', async () => {
  const { ledger, fromId, toId } = await setup();
  const initial = command(fromId, toId);

  const first = await ledger.transfer(initial);
  const replay = await ledger.transfer(initial);
  assert.equal(replay.replayed, true);
  assert.equal(replay.transferId, first.transferId);
  assert.equal((await ledger.outboxEvents()).length, 1);

  await assert.rejects(
    ledger.transfer(command(fromId, toId, { requestHash: 'different' })),
    IdempotencyConflictError,
  );
});

void test('LedgerService rolls back an insufficient transfer', async () => {
  const { ledger, fromId, toId } = await setup();

  await assert.rejects(
    ledger.transfer(command(fromId, toId, { amountMinor: 1_001n })),
    /Insufficient funds/,
  );
  assert.equal((await ledger.getAccount(fromId))?.balanceMinor, 1_000n);
  assert.equal((await ledger.getAccount(toId))?.balanceMinor, 0n);
  assert.equal((await ledger.outboxEvents()).length, 0);
});

void test('LedgerService serializes concurrent transfers without overspending', async () => {
  const { ledger, fromId, toId } = await setup();

  const outcomes = await Promise.allSettled([
    ledger.transfer(command(fromId, toId, { idempotencyKey: 'a', amountMinor: 600n })),
    ledger.transfer(command(fromId, toId, { idempotencyKey: 'b', amountMinor: 600n })),
  ]);

  assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.status === 'rejected').length, 1);
  const from = await ledger.getAccount(fromId);
  const to = await ledger.getAccount(toId);
  assert.equal(from?.balanceMinor, 400n);
  assert.equal(to?.balanceMinor, 600n);
  assert.equal((await ledger.outboxEvents()).length, 1);
});

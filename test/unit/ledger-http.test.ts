import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { LedgerService } from '../../src/application/ledger-service.js';
import type { Clock, IdGenerator } from '../../src/application/ports/clock.js';
import { createLedgerHttpServer } from '../../src/transport/http/ledger-server.js';

class ClockImpl implements Clock {
  public now(): Date {
    return new Date('2026-11-08T10:00:00.000Z');
  }
}

class IdsImpl implements IdGenerator {
  private counter = 0;
  public next(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

void test('raw Ledger HTTP API: create, transfer, replay, conflict and history', async () => {
  const ledger = new LedgerService(new ClockImpl(), new IdsImpl());
  const server = createLedgerHttpServer(ledger);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const customer = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.test' }),
    });
    assert.equal(customer.status, 201);
    const customerBody = (await customer.json()) as { id: string };

    const createAccount = (currency: string) =>
      fetch(`${baseUrl}/customers/${customerBody.id}/accounts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currency }),
      });

    const fromResponse = await createAccount('USD');
    const toResponse = await createAccount('USD');
    const from = (await fromResponse.json()) as { id: string };
    const to = (await toResponse.json()) as { id: string };
    await ledger.credit(from.id, 1_000n);

    const transferBody = {
      fromAccountId: from.id,
      toAccountId: to.id,
      amount: '2.50',
      currency: 'USD',
    };
    const transfer = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'idem-key-1' },
      body: JSON.stringify(transferBody),
    });
    assert.equal(transfer.status, 201);
    const transferred = (await transfer.json()) as { transferId: string; replayed: boolean };
    assert.equal(transferred.replayed, false);

    const replay = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'idem-key-1' },
      body: JSON.stringify(transferBody),
    });
    assert.equal(replay.status, 200);
    assert.equal(
      ((await replay.json()) as { transferId: string }).transferId,
      transferred.transferId,
    );

    const conflict = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'idem-key-1' },
      body: JSON.stringify({ ...transferBody, amount: '3.00' }),
    });
    assert.equal(conflict.status, 409);

    const fromAccount = (await (await fetch(`${baseUrl}/accounts/${from.id}`)).json()) as {
      balance: string;
    };
    const toAccount = (await (await fetch(`${baseUrl}/accounts/${to.id}`)).json()) as {
      balance: string;
    };
    assert.equal(fromAccount.balance, '7.50');
    assert.equal(toAccount.balance, '2.50');

    const history = (await (await fetch(`${baseUrl}/accounts/${from.id}/entries`)).json()) as {
      items: unknown[];
    };
    assert.equal(history.items.length, 1);

    const missing = await fetch(`${baseUrl}/accounts/missing`);
    assert.equal(missing.status, 404);
    const invalid = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ nope',
    });
    assert.equal(invalid.status, 400);
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
  }
});

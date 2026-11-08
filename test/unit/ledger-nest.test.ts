import 'reflect-metadata';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { NodeAdapter } from '@nestjs/platform-node';
import { LedgerService } from '../../src/application/ledger-service.js';
import type { Clock, IdGenerator } from '../../src/application/ports/clock.js';
import { LedgerNestModule } from '../../src/transport/nest/ledger-nest.js';

class ClockImpl implements Clock {
  public now(): Date {
    return new Date('2026-11-08T10:00:00.000Z');
  }
}

class IdsImpl implements IdGenerator {
  private counter = 0;
  public next(): string {
    this.counter += 1;
    return `nest-id-${this.counter}`;
  }
}

void test('Nest API preserves the raw Ledger contracts', async () => {
  const ledger = new LedgerService(new ClockImpl(), new IdsImpl());
  const app = await NestFactory.create(LedgerNestModule.forRoot(ledger), new NodeAdapter(), {
    logger: false,
  });
  await app.init();
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const customer = (await (
      await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'nest@example.test' }),
      })
    ).json()) as { id: string };

    const createAccount = async (): Promise<{ id: string }> =>
      (await (
        await fetch(`${baseUrl}/customers/${customer.id}/accounts`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ currency: 'USD' }),
        })
      ).json()) as { id: string };

    const from = await createAccount();
    const to = await createAccount();
    await ledger.credit(from.id, 1_000n);

    const body = {
      fromAccountId: from.id,
      toAccountId: to.id,
      amount: '4.00',
      currency: 'USD',
    };
    const first = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'nest-key-1' },
      body: JSON.stringify(body),
    });
    assert.equal(first.status, 201);
    const firstBody = (await first.json()) as { transferId: string };

    const replay = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'nest-key-1' },
      body: JSON.stringify(body),
    });
    assert.equal(replay.status, 200);
    assert.equal(
      ((await replay.json()) as { transferId: string }).transferId,
      firstBody.transferId,
    );

    const conflict = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'nest-key-1' },
      body: JSON.stringify({ ...body, amount: '5.00' }),
    });
    assert.equal(conflict.status, 409);

    const account = (await (await fetch(`${baseUrl}/accounts/${from.id}`)).json()) as {
      balance: string;
    };
    assert.equal(account.balance, '6.00');
    const entries = (await (await fetch(`${baseUrl}/accounts/${from.id}/entries`)).json()) as {
      items: unknown[];
    };
    assert.equal(entries.items.length, 1);
  } finally {
    await app.close();
  }
});

import type { Clock, IdGenerator } from './ports/clock.js';
import type { Account, AccountId, CustomerId } from '../domain/account.js';
import {
  AccountNotFoundError,
  CurrencyMismatchError,
  IdempotencyConflictError,
  InsufficientFundsError,
  ValidationError,
} from '../domain/errors.js';
import type { CurrencyCode } from '../domain/money.js';
import { serializeMoney } from '../domain/money.js';
import type { DomainEvent } from '../domain/events.js';
import type { LedgerEntry, Transfer, TransferCommand, TransferResult } from '../domain/transfer.js';

/**
 * In-memory ledger used by course examples/tests before PostgreSQL wiring. It preserves
 * domain invariants and idempotency semantics but is NOT a persistence implementation.
 */
export class LedgerService {
  private readonly customers = new Map<CustomerId, { email: string; createdAt: Date }>();
  private readonly accounts = new Map<AccountId, Account>();
  private readonly transfers = new Map<string, Transfer>();
  private readonly entries: LedgerEntry[] = [];
  private readonly outbox: DomainEvent[] = [];
  private readonly idempotency = new Map<string, { hash: string; result: TransferResult }>();

  public constructor(
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  public async createCustomer(
    email: string,
  ): Promise<{ id: CustomerId; email: string; createdAt: Date }> {
    const normalized = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
      throw new ValidationError('Invalid email');
    }
    if ([...this.customers.values()].some((customer) => customer.email === normalized)) {
      throw new ValidationError('Email already exists');
    }
    const id = this.ids.next();
    const createdAt = this.clock.now();
    this.customers.set(id, { email: normalized, createdAt });
    return { id, email: normalized, createdAt };
  }

  public async createAccount(customerId: CustomerId, currency: CurrencyCode): Promise<Account> {
    if (!this.customers.has(customerId)) {
      throw new ValidationError('Customer not found');
    }
    const account: Account = {
      id: this.ids.next(),
      customerId,
      currency,
      status: 'active',
      balanceMinor: 0n,
      createdAt: this.clock.now(),
    };
    this.accounts.set(account.id, account);
    return account;
  }

  public async getAccount(accountId: AccountId): Promise<Account | null> {
    return this.accounts.get(accountId) ?? null;
  }

  /** Test/demo funding primitive; a real ledger would post a deposit entry. */
  public async credit(accountId: AccountId, amountMinor: bigint): Promise<Account> {
    const account = this.accounts.get(accountId);
    if (account === undefined) {
      throw new AccountNotFoundError(accountId);
    }
    if (amountMinor <= 0n) {
      throw new ValidationError('Credit amount must be positive');
    }
    const updated: Account = {
      ...account,
      balanceMinor: account.balanceMinor + amountMinor,
    };
    this.accounts.set(accountId, updated);
    return updated;
  }

  public async listEntries(accountId: AccountId): Promise<readonly LedgerEntry[]> {
    return this.entries.filter((entry) => entry.accountId === accountId);
  }

  public async outboxEvents(): Promise<readonly DomainEvent[]> {
    return [...this.outbox];
  }

  public async transfer(command: TransferCommand): Promise<TransferResult> {
    const previous = this.idempotency.get(command.idempotencyKey);
    if (previous !== undefined) {
      if (previous.hash !== command.requestHash) {
        throw new IdempotencyConflictError(command.idempotencyKey);
      }
      return { ...previous.result, replayed: true };
    }

    const from = this.accounts.get(command.fromAccountId);
    if (from === undefined) {
      throw new AccountNotFoundError(command.fromAccountId);
    }
    const to = this.accounts.get(command.toAccountId);
    if (to === undefined) {
      throw new AccountNotFoundError(command.toAccountId);
    }
    if (from.id === to.id) {
      throw new ValidationError('Source and target accounts must differ');
    }
    if (command.amountMinor <= 0n) {
      throw new ValidationError('Transfer amount must be positive');
    }
    if (from.currency !== command.currency) {
      throw new CurrencyMismatchError(from.currency, command.currency);
    }
    if (to.currency !== command.currency) {
      throw new CurrencyMismatchError(to.currency, command.currency);
    }
    if (from.status !== 'active' || to.status !== 'active') {
      throw new ValidationError('Both accounts must be active');
    }
    if (from.balanceMinor < command.amountMinor) {
      throw new InsufficientFundsError(from.id);
    }

    const now = this.clock.now();
    const transferId = this.ids.next();
    const transfer: Transfer = {
      id: transferId,
      fromAccountId: from.id,
      toAccountId: to.id,
      amountMinor: command.amountMinor,
      currency: command.currency,
      status: 'completed',
      idempotencyKey: command.idempotencyKey,
      requestHash: command.requestHash,
      createdAt: now,
    };
    const entries: LedgerEntry[] = [
      {
        id: this.ids.next(),
        transferId,
        accountId: from.id,
        direction: 'debit',
        amountMinor: command.amountMinor,
        createdAt: now,
      },
      {
        id: this.ids.next(),
        transferId,
        accountId: to.id,
        direction: 'credit',
        amountMinor: command.amountMinor,
        createdAt: now,
      },
    ];

    // All mutations below are synchronous, so concurrent callers cannot interleave.
    this.accounts.set(from.id, {
      ...from,
      balanceMinor: from.balanceMinor - command.amountMinor,
    });
    this.accounts.set(to.id, { ...to, balanceMinor: to.balanceMinor + command.amountMinor });
    this.transfers.set(transferId, transfer);
    this.entries.push(...entries);
    this.outbox.push({
      eventId: this.ids.next(),
      aggregateType: 'transfer',
      aggregateId: transferId,
      eventType: 'TransferCreated',
      occurredAt: now,
      payload: {
        transferId,
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: serializeMoney({ amountMinor: command.amountMinor, currency: command.currency })
          .amount,
        currency: command.currency,
      },
    });

    const result: TransferResult = {
      transferId,
      status: 'completed',
      fromAccountId: from.id,
      toAccountId: to.id,
      amountMinor: command.amountMinor,
      currency: command.currency,
      replayed: false,
    };
    this.idempotency.set(command.idempotencyKey, {
      hash: command.requestHash,
      result,
    });
    return result;
  }
}

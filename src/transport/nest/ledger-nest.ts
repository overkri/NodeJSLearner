import 'reflect-metadata';
import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Injectable,
  Inject,
  Module,
  NotFoundException,
  Param,
  Post,
  Res,
  UnprocessableEntityException,
  type DynamicModule,
} from '@nestjs/common';
import { NodeResponse } from '@nestjs/platform-node';
import { z } from 'zod';
import type { LedgerService } from '../../application/ledger-service.js';
import { LedgerService as LedgerServiceToken } from '../../application/ledger-service.js';
import { DomainError } from '../../domain/errors.js';
import { parseMoneyString, serializeMoney } from '../../domain/money.js';
import type { Account } from '../../domain/account.js';

const customerSchema = z
  .object({ email: z.string().regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'invalid email') })
  .strict();
const accountSchema = z.object({ currency: z.enum(['USD', 'EUR', 'GBP']) }).strict();
const transferSchema = z
  .object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
    currency: z.enum(['USD', 'EUR', 'GBP']),
  })
  .strict();

function mapError(error: unknown): never {
  if (error instanceof DomainError) {
    switch (error.code) {
      case 'ACCOUNT_NOT_FOUND':
        throw new NotFoundException(error.message);
      case 'INSUFFICIENT_FUNDS':
      case 'IDEMPOTENCY_CONFLICT':
        throw new ConflictException(error.message);
      case 'CURRENCY_MISMATCH':
        throw new UnprocessableEntityException(error.message);
      default:
        throw new BadRequestException(error.message);
    }
  }
  throw error;
}

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(result.error.issues.map((issue) => issue.message).join('; '));
  }
  return result.data;
}

function accountView(account: Account): object {
  return {
    id: account.id,
    customerId: account.customerId,
    currency: account.currency,
    status: account.status,
    balance: serializeMoney({ amountMinor: account.balanceMinor, currency: account.currency })
      .amount,
  };
}

@Controller()
@Injectable()
export class LedgerNestController {
  public constructor(@Inject(LedgerServiceToken) private readonly ledger: LedgerService) {}

  @Get('health')
  public health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Post('customers')
  public async createCustomer(@Body() body: unknown): Promise<object> {
    const parsed = parseBody(customerSchema, body);
    try {
      return await this.ledger.createCustomer(parsed.email);
    } catch (error) {
      return mapError(error);
    }
  }

  @Post('customers/:customerId/accounts')
  public async createAccount(
    @Param('customerId') customerId: string,
    @Body() body: unknown,
  ): Promise<object> {
    const parsed = parseBody(accountSchema, body);
    try {
      return accountView(await this.ledger.createAccount(customerId, parsed.currency));
    } catch (error) {
      return mapError(error);
    }
  }

  @Get('accounts/:accountId')
  public async getAccount(@Param('accountId') accountId: string): Promise<object> {
    const account = await this.ledger.getAccount(accountId);
    if (account === null) {
      throw new NotFoundException('Account not found');
    }
    return accountView(account);
  }

  @Get('accounts/:accountId/entries')
  public async entries(@Param('accountId') accountId: string): Promise<object> {
    const account = await this.ledger.getAccount(accountId);
    if (account === null) {
      throw new NotFoundException('Account not found');
    }
    const entries = await this.ledger.listEntries(accountId);
    return {
      items: entries.map((entry) => ({
        id: entry.id,
        transferId: entry.transferId,
        direction: entry.direction,
        amount: serializeMoney({ amountMinor: entry.amountMinor, currency: account.currency })
          .amount,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  @Post('transfers')
  public async transfer(
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: NodeResponse,
  ): Promise<object> {
    if (key === undefined || key.length < 8) {
      throw new BadRequestException('Idempotency-Key is required');
    }
    const parsed = parseBody(transferSchema, body);
    const amountMinor = parseMoneyString(parsed.amount, parsed.currency).amountMinor;
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          from: parsed.fromAccountId,
          to: parsed.toAccountId,
          amount: parsed.amount,
          currency: parsed.currency,
        }),
      )
      .digest('hex');

    try {
      const result = await this.ledger.transfer({
        fromAccountId: parsed.fromAccountId,
        toAccountId: parsed.toAccountId,
        amountMinor,
        currency: parsed.currency,
        idempotencyKey: key,
        requestHash,
      });
      response.status(result.replayed ? 200 : 201);
      return {
        transferId: result.transferId,
        status: result.status,
        fromAccountId: result.fromAccountId,
        toAccountId: result.toAccountId,
        amount: serializeMoney({ amountMinor: result.amountMinor, currency: result.currency })
          .amount,
        currency: result.currency,
        replayed: result.replayed,
      };
    } catch (error) {
      return mapError(error);
    }
  }
}

@Module({})
export class LedgerNestModule {
  public static forRoot(ledger: LedgerService): DynamicModule {
    return {
      module: LedgerNestModule,
      controllers: [LedgerNestController],
      providers: [{ provide: LedgerServiceToken, useValue: ledger }],
    };
  }
}

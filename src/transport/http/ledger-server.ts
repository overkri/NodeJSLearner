import { createHash, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { z } from 'zod';
import type { LedgerService } from '../../application/ledger-service.js';
import { DomainError } from '../../domain/errors.js';
import { parseMoneyString, serializeMoney } from '../../domain/money.js';

const BODY_LIMIT = 1_048_576;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

class HttpError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

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

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  requestId: string,
): void {
  if (response.headersSent) {
    return;
  }
  const payload = Buffer.from(JSON.stringify(body));
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('content-length', payload.byteLength);
  response.setHeader('x-request-id', requestId);
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('x-frame-options', 'DENY');
  response.setHeader('cache-control', 'no-store');
  response.end(payload);
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    total += buffer.byteLength;
    if (total > BODY_LIMIT) {
      request.pause();
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');
    }
    chunks.push(buffer);
  }
  if (total === 0) {
    return undefined;
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body is not valid JSON');
  }
}

function errorResponse(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }
  if (error instanceof DomainError) {
    const status =
      error.code === 'ACCOUNT_NOT_FOUND'
        ? 404
        : error.code === 'INSUFFICIENT_FUNDS' || error.code === 'IDEMPOTENCY_CONFLICT'
          ? 409
          : error.code === 'CURRENCY_MISMATCH'
            ? 422
            : 400;
    return new HttpError(status, error.code, error.message);
  }
  return new HttpError(500, 'INTERNAL_ERROR', 'Internal server error');
}

function requestId(request: IncomingMessage): string {
  const raw = request.headers['x-request-id'];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return candidate !== undefined && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
}

export function createLedgerHttpServer(ledger: LedgerService): Server {
  return createServer((request, response) => {
    const id = requestId(request);
    void (async () => {
      try {
        const url = new URL(request.url ?? '/', 'http://localhost');
        const segments = url.pathname.split('/').filter((segment) => segment !== '');
        const method = request.method ?? 'GET';

        if (method === 'GET' && url.pathname === '/health') {
          sendJson(response, 200, { status: 'ok' }, id);
          return;
        }

        if (method === 'POST' && segments.length === 1 && segments[0] === 'customers') {
          const parsed = customerSchema.parse(await readBody(request));
          const customer = await ledger.createCustomer(parsed.email);
          sendJson(response, 201, customer, id);
          return;
        }

        if (
          method === 'POST' &&
          segments.length === 3 &&
          segments[0] === 'customers' &&
          segments[2] === 'accounts'
        ) {
          const parsed = accountSchema.parse(await readBody(request));
          const account = await ledger.createAccount(segments[1] as string, parsed.currency);
          sendJson(
            response,
            201,
            {
              id: account.id,
              customerId: account.customerId,
              currency: account.currency,
              status: account.status,
              balance: serializeMoney({
                amountMinor: account.balanceMinor,
                currency: account.currency,
              }).amount,
            },
            id,
          );
          return;
        }

        if (method === 'GET' && segments.length === 2 && segments[0] === 'accounts') {
          const account = await ledger.getAccount(segments[1] as string);
          if (account === null) {
            throw new HttpError(404, 'ACCOUNT_NOT_FOUND', 'Account not found');
          }
          sendJson(
            response,
            200,
            {
              id: account.id,
              customerId: account.customerId,
              currency: account.currency,
              status: account.status,
              balance: serializeMoney({
                amountMinor: account.balanceMinor,
                currency: account.currency,
              }).amount,
            },
            id,
          );
          return;
        }

        if (
          method === 'GET' &&
          segments.length === 3 &&
          segments[0] === 'accounts' &&
          segments[2] === 'entries'
        ) {
          const account = await ledger.getAccount(segments[1] as string);
          if (account === null) {
            throw new HttpError(404, 'ACCOUNT_NOT_FOUND', 'Account not found');
          }
          const entries = await ledger.listEntries(account.id);
          sendJson(
            response,
            200,
            {
              items: entries.map((entry) => ({
                id: entry.id,
                transferId: entry.transferId,
                direction: entry.direction,
                amount: serializeMoney({
                  amountMinor: entry.amountMinor,
                  currency: account.currency,
                }).amount,
                createdAt: entry.createdAt.toISOString(),
              })),
            },
            id,
          );
          return;
        }

        if (method === 'POST' && segments.length === 1 && segments[0] === 'transfers') {
          const key = request.headers['idempotency-key'];
          const idempotencyKey = Array.isArray(key) ? key[0] : key;
          if (idempotencyKey === undefined || idempotencyKey.length < 8) {
            throw new HttpError(400, 'VALIDATION_ERROR', 'Idempotency-Key is required');
          }
          const parsed = transferSchema.parse(await readBody(request));
          const amountMinor = parseMoneyString(parsed.amount, parsed.currency).amountMinor;
          const hash = createHash('sha256')
            .update(
              JSON.stringify({
                from: parsed.fromAccountId,
                to: parsed.toAccountId,
                amount: parsed.amount,
                currency: parsed.currency,
              }),
            )
            .digest('hex');
          const result = await ledger.transfer({
            fromAccountId: parsed.fromAccountId,
            toAccountId: parsed.toAccountId,
            amountMinor,
            currency: parsed.currency,
            idempotencyKey,
            requestHash: hash,
          });
          sendJson(
            response,
            result.replayed ? 200 : 201,
            {
              transferId: result.transferId,
              status: result.status,
              fromAccountId: result.fromAccountId,
              toAccountId: result.toAccountId,
              amount: serializeMoney({
                amountMinor: result.amountMinor,
                currency: result.currency,
              }).amount,
              currency: result.currency,
              replayed: result.replayed,
            },
            id,
          );
          return;
        }

        throw new HttpError(404, 'NOT_FOUND', 'Route not found');
      } catch (error) {
        const mapped = errorResponse(error);
        if (mapped.statusCode === 413) {
          request.resume();
        }
        sendJson(
          response,
          mapped.statusCode,
          { error: { code: mapped.code, message: mapped.message, requestId: id } },
          id,
        );
      }
    })();
  });
}

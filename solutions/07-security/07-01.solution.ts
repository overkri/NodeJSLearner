import { z } from 'zod';

export type Currency = 'USD' | 'EUR' | 'GBP';

export interface CreateTransferInput {
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly amountMinor: bigint;
  readonly currency: Currency;
}

export class RequestValidationError extends Error {
  public override readonly name = 'RequestValidationError';
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 400;
  public readonly issues: readonly string[];

  public constructor(issues: readonly string[]) {
    super(`Invalid request:\n${issues.join('\n')}`);
    this.issues = issues;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/;

const schema = z
  .object({
    fromAccountId: z.string().regex(UUID_PATTERN, 'must be a UUID'),
    toAccountId: z.string().regex(UUID_PATTERN, 'must be a UUID'),
    amount: z.string().regex(AMOUNT_PATTERN, 'must be a positive decimal with <=2 decimals'),
    currency: z.enum(['USD', 'EUR', 'GBP']),
  })
  .strict()
  .refine((value) => value.fromAccountId !== value.toAccountId, {
    message: 'accounts must differ',
    path: ['toAccountId'],
  });

function toMinorUnits(amount: string): bigint {
  const [whole = '0', fraction = ''] = amount.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function parseCreateTransfer(body: unknown): CreateTransferInput {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new RequestValidationError(
      result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
        return `${path}: ${issue.message}`;
      }),
    );
  }

  const amountMinor = toMinorUnits(result.data.amount);
  if (amountMinor <= 0n) {
    throw new RequestValidationError(['amount: must be greater than zero']);
  }

  return {
    fromAccountId: result.data.fromAccountId,
    toAccountId: result.data.toAccountId,
    amountMinor,
    currency: result.data.currency,
  };
}

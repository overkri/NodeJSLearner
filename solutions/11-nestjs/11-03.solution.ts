import 'reflect-metadata';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { z, type ZodType } from 'zod';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/;

function toMinor(amount: string): bigint {
  const [whole = '0', fraction = ''] = amount.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

const baseSchema = z
  .object({
    fromAccountId: z.string().regex(UUID_PATTERN, 'fromAccountId must be a UUID'),
    toAccountId: z.string().regex(UUID_PATTERN, 'toAccountId must be a UUID'),
    amount: z
      .string()
      .regex(AMOUNT_PATTERN, 'amount must be a positive decimal with <=2 decimals')
      .refine(
        (value) => !AMOUNT_PATTERN.test(value) || toMinor(value) > 0n,
        'amount must be greater than zero',
      ),
    currency: z.enum(['USD', 'EUR', 'GBP']),
  })
  .strict()
  .refine((value) => value.fromAccountId !== value.toAccountId, {
    message: 'fromAccountId and toAccountId must differ',
    path: ['toAccountId'],
  });

const transferBodySchema = baseSchema.transform((value) => ({
  fromAccountId: value.fromAccountId,
  toAccountId: value.toAccountId,
  currency: value.currency,
  amountMinor: toMinor(value.amount),
}));

export function createTransferBodySchema(): ZodType {
  return transferBodySchema;
}

export async function validateTransferBody(value: unknown): Promise<unknown> {
  const pipe = new StandardSchemaValidationPipe();
  return await pipe.transform(value, {
    type: 'body',
    schema: createTransferBodySchema(),
  });
}

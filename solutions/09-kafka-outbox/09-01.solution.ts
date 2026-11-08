import { z } from 'zod';

export type EventCurrency = 'USD' | 'EUR' | 'GBP';

export interface TransferCreatedPayload {
  readonly transferId: string;
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly amount: string;
  readonly currency: EventCurrency;
}

export interface EventEnvelope {
  readonly schemaVersion: 1;
  readonly eventId: string;
  readonly eventType: 'TransferCreated';
  readonly aggregateType: 'transfer';
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly payload: TransferCreatedPayload;
}

export class EventValidationError extends Error {
  public override readonly name = 'EventValidationError';
  public readonly code = 'EVENT_VALIDATION_ERROR';
  public readonly issues: readonly string[];

  public constructor(issues: readonly string[]) {
    super(`Invalid event:\n${issues.join('\n')}`);
    this.issues = issues;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

const idSchema = z.string().regex(UUID_PATTERN, 'must be a UUID');
const payloadSchema = z
  .object({
    transferId: idSchema,
    fromAccountId: idSchema,
    toAccountId: idSchema,
    amount: z
      .string()
      .regex(AMOUNT_PATTERN, 'must be a non-negative decimal with <=2 decimals')
      .refine((value) => {
        if (!AMOUNT_PATTERN.test(value)) {
          return false;
        }
        const [whole = '0', fraction = ''] = value.split('.');
        return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')) > 0n;
      }, 'must be greater than zero'),
    currency: z.enum(['USD', 'EUR', 'GBP']),
  })
  .strict();

const envelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: idSchema,
    eventType: z.literal('TransferCreated'),
    aggregateType: z.literal('transfer'),
    aggregateId: idSchema,
    occurredAt: z.string().regex(ISO_PATTERN, 'must be an ISO-8601 UTC timestamp'),
    payload: payloadSchema,
  })
  .strict()
  .refine((value) => value.aggregateId === value.payload.transferId, {
    message: 'aggregateId must equal payload.transferId',
    path: ['aggregateId'],
  });

export function parseEventEnvelope(input: unknown): EventEnvelope {
  const result = envelopeSchema.safeParse(input);
  if (!result.success) {
    throw new EventValidationError(
      result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
        return `${path}: ${issue.message}`;
      }),
    );
  }
  return result.data;
}

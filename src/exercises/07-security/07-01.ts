import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 07-01
 * Topic: runtime validation at the HTTP boundary with Zod
 * Java/Spring analogy: @Valid + Bean Validation on a DTO, but TypeScript types disappear
 * and the external payload is `unknown` until a schema accepts it.
 * Requirements:
 * - parseCreateTransfer validates a transfer body and returns amountMinor as bigint.
 * - from/to are UUIDs and must differ; currency is USD|EUR|GBP.
 * - amount is a positive decimal string with at most 2 fraction digits.
 * - Unknown fields are rejected; error message lists field paths, not raw values.
 * Hints:
 * - Parse the amount after schema validation; never use Number for money.
 * - `.strict()` rejects unknown keys.
 * Trap: casting `body as CreateTransferDto`; trusting JSON.parse.
 * Run tests: npm run test:exercises -- --test-name-pattern="07-01"
 */

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

export function parseCreateTransfer(body: unknown): CreateTransferInput {
  void body;
  throw new NotImplementedError('parseCreateTransfer');
}

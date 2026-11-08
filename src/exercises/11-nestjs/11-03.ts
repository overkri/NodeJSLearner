import 'reflect-metadata';
import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 11-03
 * Topic: Nest StandardSchemaValidationPipe + Zod transform
 * Java/Spring analogy: Bean Validation + a DTO mapper; in Nest 12 the schema can live on
 * the parameter and the pipe returns the transformed value.
 * Requirements:
 * - createTransferBodySchema validates from/to UUIDs, currency, decimal amount.
 * - The schema transforms amount -> amountMinor: bigint and rejects same accounts.
 * - validateTransferBody uses StandardSchemaValidationPipe and returns the transformed body.
 * - Invalid input produces Nest BadRequestException.
 * Hints:
 * - Zod `.transform` output is what the pipe returns (transform=true default).
 * - Pass `{ type: 'body', schema }` as ArgumentMetadata in a direct unit test.
 * Trap: validating only TypeScript types; class-validator is not part of this stack.
 * Run tests: npm run test:exercises -- --test-name-pattern="11-03"
 */

export function createTransferBodySchema(): unknown {
  throw new NotImplementedError('createTransferBodySchema');
}

export async function validateTransferBody(value: unknown): Promise<unknown> {
  void value;
  throw new NotImplementedError('validateTransferBody');
}

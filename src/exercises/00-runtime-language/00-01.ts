import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 00-01
 * Topic: JavaScript value semantics, truthiness, Map/Set, bigint
 * Java/Spring analogy: Map/Set are close to Java collections, but JS object keys are
 * strings/symbols, `0` is falsy, and `bigint` is a distinct primitive (not `long`).
 * Requirements:
 * - parseOptionalMinor: null/undefined/blank -> null; strict integer string -> bigint;
 *   reject decimals, exponents, whitespace inside, and non-numeric text.
 * - summarizeLines: total per currency, unique account ids, any negative amount;
 *   never mutate the input.
 * Hints:
 * - Test `value.trim() === ''`, not `!value`: `"0"` is truthy but `0` is not.
 * - A Map preserves insertion order; a plain object coerces keys to strings.
 * Trap: `Array.prototype.sort` mutates in place and default sort is lexicographic.
 * Run tests: npm run test:exercises -- --test-name-pattern="00-01"
 */

export interface LedgerLine {
  readonly accountId: string;
  readonly currency: string;
  readonly amountMinor: bigint;
}

export interface LedgerSummary {
  readonly totalsByCurrency: ReadonlyMap<string, bigint>;
  readonly accountIds: ReadonlySet<string>;
  readonly hasNegative: boolean;
}

export function parseOptionalMinor(value: string | null | undefined): bigint | null {
  void value;
  throw new NotImplementedError('parseOptionalMinor');
}

export function summarizeLines(lines: readonly LedgerLine[]): LedgerSummary {
  void lines;
  throw new NotImplementedError('summarizeLines');
}

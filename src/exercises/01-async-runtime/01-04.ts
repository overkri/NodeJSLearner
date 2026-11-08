import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 01-04
 * Topic: async error propagation, timers, AbortSignal, cleanup
 * Java/Spring analogy: Future.get(timeout) + cancellation, but Promise has no built-in
 * timeout/cancel; you must clear timers and handle the loser of a race.
 * Requirements:
 * - withTimeout runs operation with an AbortSignal and rejects with TimeoutError after
 *   timeoutMs.
 * - An external abort rejects with OperationCancelledError.
 * - A fast success/failure clears the timer; late settlement is ignored without unhandled
 *   rejections.
 * - timeoutMs must be a finite number >= 0; toError normalizes non-Error throws.
 * Hints:
 * - Attach handlers to the operation promise even after timeout to swallow late rejection.
 * - Remove abort listeners and clear timers in one cleanup path.
 * Trap: Promise.race alone leaves timers/listeners alive and can leak late rejections.
 * Run tests: npm run test:exercises -- --test-name-pattern="01-04"
 */

export class TimeoutError extends Error {
  public override readonly name = 'TimeoutError';
  public readonly code = 'TIMEOUT';

  public constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
  }
}

export class OperationCancelledError extends Error {
  public override readonly name = 'OperationCancelledError';
  public readonly code = 'CANCELLED';

  public constructor() {
    super('Operation cancelled');
  }
}

export interface TimeoutOptions {
  readonly signal?: AbortSignal;
}

export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  options: TimeoutOptions = {},
): Promise<T> {
  void operation;
  void timeoutMs;
  void options;
  throw new NotImplementedError('withTimeout');
}

export function toError(value: unknown): Error {
  void value;
  throw new NotImplementedError('toError');
}

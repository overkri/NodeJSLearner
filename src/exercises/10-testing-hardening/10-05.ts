import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 10-05
 * Topic: deterministic fault injection for retry/resilience tests
 * Java/Spring analogy: a test stub that throws N times (Mockito thenThrow), but explicit
 * and reusable across services without a mocking framework.
 * Requirements:
 * - injectFailures fails the first N calls with errorFactory(), then delegates.
 * - Track attempts and failures remaining; reset() restores the schedule.
 * - failures is an integer >= 0; errorFactory must produce Error.
 * - The wrapper must preserve async behavior (reject, not throw synchronously).
 * Hints:
 * - Use a closure counter; return a callable wrapper plus controls.
 * - `Promise.resolve().then(() => operation(...args))` normalizes sync throws.
 * Trap: failing based on Date/Math.random; sharing state between tests.
 * Run tests: npm run test:exercises -- --test-name-pattern="10-05"
 */

export interface FailureInjectionOptions {
  readonly failures: number;
  readonly errorFactory?: () => Error;
}

export interface InjectedFailure<TArgs extends unknown[], TResult> {
  run(...args: TArgs): Promise<TResult>;
  attempts(): number;
  failuresRemaining(): number;
  reset(): void;
}

export function injectFailures<TArgs extends unknown[], TResult>(
  operation: (...args: TArgs) => Promise<TResult>,
  options: FailureInjectionOptions,
): InjectedFailure<TArgs, TResult> {
  void operation;
  void options;
  throw new NotImplementedError('injectFailures');
}

import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 10-01
 * Topic: polling with a bounded timeout for async integration tests
 * Java/Spring analogy: Awaitility.await().atMost(...).until(...), but timers and cleanup
 * are yours; a polling helper must never hang the test process.
 * Requirements:
 * - waitFor calls probe until it returns a non-undefined value or times out.
 * - Probe errors are retried until timeout; the last error is preserved as cause.
 * - timeoutMs/intervalMs are validated; timeoutMs >= 1, intervalMs >= 0.
 * - now and sleep are injectable for deterministic tests.
 * Hints:
 * - Use `value !== undefined`, not truthiness.
 * - Check the deadline before sleeping and after probe failure.
 * Trap: `while (true) await sleep(...)` without deadline; `setInterval` without clear.
 * Run tests: npm run test:exercises -- --test-name-pattern="10-01"
 */

export interface WaitForOptions {
  readonly timeoutMs?: number;
  readonly intervalMs?: number;
  readonly now?: () => number;
  readonly sleep?: (delayMs: number) => Promise<void>;
}

export class WaitForTimeoutError extends Error {
  public override readonly name = 'WaitForTimeoutError';
  public readonly code = 'WAIT_FOR_TIMEOUT';

  public constructor(timeoutMs: number, cause?: unknown) {
    super(`Condition not met within ${timeoutMs}ms`, { cause });
  }
}

export async function waitFor<T>(
  probe: () => Promise<T | undefined>,
  options: WaitForOptions = {},
): Promise<T> {
  void probe;
  void options;
  throw new NotImplementedError('waitFor');
}

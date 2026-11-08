import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 01-02
 * Topic: Promise concurrency, bounded parallelism, AbortSignal
 * Java/Spring analogy: a bounded executor/thread pool, but Promises do not create threads;
 * libuv performs I/O in its own pool. Backpressure must be implemented explicitly.
 * Requirements:
 * - mapWithConcurrency processes items with at most `limit` mapper calls in flight.
 * - Results keep input order; mapper is called once per processed item.
 * - limit must be an integer >= 1; empty input returns [].
 * - A mapper rejection rejects the result without starting new work; in-flight work settles.
 * - Aborting the signal stops new work and rejects with AbortOperationError.
 * Hints:
 * - Use a shared index and N workers, not Promise.all over all items.
 * - Catch mapper errors: an unobserved rejection can terminate the process.
 * Trap: `items.map(async ...)` is unbounded and ignores the limit.
 * Run tests: npm run test:exercises -- --test-name-pattern="01-02"
 */

export class AbortOperationError extends Error {
  public override readonly name = 'AbortOperationError';
  public readonly code = 'ABORT_ERR';

  public constructor() {
    super('Operation aborted');
  }
}

export interface MapOptions {
  readonly signal?: AbortSignal;
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
  options: MapOptions = {},
): Promise<R[]> {
  void items;
  void limit;
  void mapper;
  void options;
  throw new NotImplementedError('mapWithConcurrency');
}

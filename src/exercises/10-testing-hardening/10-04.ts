import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 10-04
 * Topic: deterministic concurrency test primitives (Deferred, Barrier)
 * Java/Spring analogy: CountDownLatch/CompletableFuture, but Promises need explicit
 * coordination; these helpers make races reproducible instead of sleep-based.
 * Requirements:
 * - createDeferred exposes promise + settle-once resolve/reject.
 * - Barrier(count) resolves waiters together when count waiters arrive or release() is called.
 * - wait() after release resolves immediately; count is an integer >= 1.
 * Hints:
 * - A Deferred must ignore the second settle call, like a Promise.
 * - Keep waiters in an array; clear it after release.
 * Trap: `await sleep(10)` instead of a barrier; unhandled rejection from unused Deferred.
 * Run tests: npm run test:exercises -- --test-name-pattern="10-04"
 */

export interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

export function createDeferred<T>(): Deferred<T> {
  throw new NotImplementedError('createDeferred');
}

export class Barrier {
  public constructor(count: number) {
    void count;
    throw new NotImplementedError('Barrier constructor');
  }

  public get waiting(): number {
    throw new NotImplementedError('Barrier.waiting');
  }

  public wait(): Promise<void> {
    throw new NotImplementedError('Barrier.wait');
  }

  public release(): void {
    throw new NotImplementedError('Barrier.release');
  }
}

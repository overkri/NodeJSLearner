import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 01-01
 * Topic: event loop phases, nextTick, microtasks, macrotasks
 * Java/Spring analogy: a single servlet worker pool is replaced by one JS thread plus
 * libuv; CompletableFuture callbacks are microtasks, not separate threads.
 * Requirements:
 * - runOrderingDemo records: sync code, process.nextTick, queueMicrotask, Promise.then,
 *   then a timer callback, then an immediate callback, and returns the observed order.
 * - The returned order must be deterministic across Node 26 ESM runs.
 * Hints:
 * - In Node 26 ESM, Promise microtasks run before process.nextTick (unlike CommonJS).
 * - Await timers/immediates in separate phases instead of racing setTimeout vs setImmediate.
 * Trap: comparing setTimeout(fn, 0) and setImmediate from the main module is not portable.
 * Run tests: npm run test:exercises -- --test-name-pattern="01-01"
 */

export async function runOrderingDemo(): Promise<readonly string[]> {
  throw new NotImplementedError('runOrderingDemo');
}

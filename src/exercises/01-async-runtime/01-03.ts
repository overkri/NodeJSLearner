import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 01-03
 * Topic: worker_threads, structured clone, transferable buffers
 * Java/Spring analogy: worker_threads are closer to separate JVM threads than Promises:
 * each has its own JS isolate and event loop. Communication is message passing, not shared
 * mutable objects (SharedArrayBuffer is the explicit exception).
 * Requirements:
 * - sumInWorker(values) computes the sum in a Worker and resolves with a bigint.
 * - The input is transferred as a BigInt64Array; empty input returns 0n.
 * - The worker must be terminated/closed on success and on failure.
 * Hints:
 * - `new Worker(new URL('./01-03.worker.ts', import.meta.url))`.
 * - Transfer the underlying ArrayBuffer: `postMessage(buffer, [buffer.buffer])`.
 * Trap: doing the sum in a Promise still blocks the main thread; Promise is not parallelism.
 * Run tests: npm run test:exercises -- --test-name-pattern="01-03"
 */

export function sumInWorker(values: readonly bigint[]): Promise<bigint> {
  void values;
  throw new NotImplementedError('sumInWorker');
}

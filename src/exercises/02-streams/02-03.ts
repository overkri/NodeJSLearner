import type { Writable } from 'node:stream';
import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 02-03
 * Topic: backpressure with Writable.write/drain
 * Java/Spring analogy: OutputStream.write blocks when the OS buffer is full; Node's
 * Writable.write returns false and the producer must await 'drain'.
 * Requirements:
 * - Write every chunk to destination and resolves with the number of bytes written.
 * - Respect backpressure: when write() returns false, wait for 'drain'.
 * - Honor AbortSignal: abort destroys the destination and rejects with AbortError.
 * - Propagate destination errors; always remove listeners.
 * Hints:
 * - `destination.write(buffer)` returns false when the internal buffer is full.
 * - `events.once(destination, 'drain')` rejects when the destination emits 'error'.
 * Trap: ignoring the boolean return value grows an unbounded in-memory buffer.
 * Run tests: npm run test:exercises -- --test-name-pattern="02-03"
 */

export interface WriteOptions {
  readonly signal?: AbortSignal;
}

export async function writeAll(
  destination: Writable,
  chunks: AsyncIterable<Uint8Array>,
  options: WriteOptions = {},
): Promise<number> {
  void destination;
  void chunks;
  void options;
  throw new NotImplementedError('writeAll');
}

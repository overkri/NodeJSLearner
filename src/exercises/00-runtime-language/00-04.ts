import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 00-04
 * Topic: Buffer, byte lengths, views vs copies, UTF-8
 * Java/Spring analogy: Buffer is a mutable byte[] with offset/length; unlike String,
 * its length is bytes. A slice is a view over the same memory.
 * Requirements:
 * - readAsciiPrefix returns an ASCII-only prefix and rejects invalid length/bytes.
 * - concatChunks returns a new Buffer that does not alias input chunks.
 * - splitOn splits on a non-empty delimiter; it returns copies, not views.
 * - decodeUtf8Strict rejects invalid UTF-8; sha256Hex returns lowercase hex.
 * Hints:
 * - `subarray`/`slice` share memory; `Buffer.from` and `Buffer.concat` copy.
 * - `TextDecoder` with `{ fatal: true }` turns malformed sequences into errors.
 * Trap: `buffer.toString('utf8')` silently inserts U+FFFD instead of reporting bad bytes.
 * Run tests: npm run test:exercises -- --test-name-pattern="00-04"
 */

export function readAsciiPrefix(input: Buffer, length: number): string {
  void input;
  void length;
  throw new NotImplementedError('readAsciiPrefix');
}

export function concatChunks(chunks: readonly Uint8Array[]): Buffer {
  void chunks;
  throw new NotImplementedError('concatChunks');
}

export function splitOn(input: Buffer, delimiter: Buffer): Buffer[] {
  void input;
  void delimiter;
  throw new NotImplementedError('splitOn');
}

export function decodeUtf8Strict(input: Buffer): string {
  void input;
  throw new NotImplementedError('decodeUtf8Strict');
}

export function sha256Hex(input: Buffer): string {
  void input;
  throw new NotImplementedError('sha256Hex');
}

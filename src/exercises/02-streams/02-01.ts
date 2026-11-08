import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 02-01
 * Topic: async iterables, UTF-8 chunk boundaries, line splitting
 * Java/Spring analogy: a BufferedReader over an InputStream, but chunks arrive as
 * Uint8Array and a multi-byte character may be split across two chunks.
 * Requirements:
 * - Yield lines from an async byte stream, stripping a trailing CR before LF.
 * - Support the final line without a newline; preserve empty lines.
 * - Reject lines longer than maxLineLength (default 65_536) and honor AbortSignal.
 * Hints:
 * - `StringDecoder` buffers incomplete UTF-8 sequences between chunks.
 * - Keep a carry string; split on '\n' and keep the remainder for the next chunk.
 * Trap: `chunk.toString()` per chunk corrupts Cyrillic/emoji split across chunks.
 * Run tests: npm run test:exercises -- --test-name-pattern="02-01"
 */

export interface ReadLinesOptions {
  readonly maxLineLength?: number;
  readonly signal?: AbortSignal;
}

export class LineTooLongError extends Error {
  public override readonly name = 'LineTooLongError';
  public readonly code = 'LINE_TOO_LONG';

  public constructor(maxLineLength: number) {
    super(`Line exceeds ${maxLineLength} characters`);
  }
}

// eslint-disable-next-line require-yield -- starter intentionally has no yield yet
export async function* readLines(
  stream: AsyncIterable<Uint8Array>,
  options: ReadLinesOptions = {},
): AsyncGenerator<string> {
  void stream;
  void options;
  throw new NotImplementedError('readLines');
}

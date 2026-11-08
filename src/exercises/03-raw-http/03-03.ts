import type { Readable } from 'node:stream';
import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 03-03
 * Topic: bounded request body reading and JSON parsing
 * Java/Spring analogy: a servlet InputStream + Jackson, but there is no container limit by
 * default and JSON.parse throws SyntaxError without HTTP semantics.
 * Requirements:
 * - readJsonBody reads at most maxBytes (default 1 MiB); empty body -> undefined.
 * - Exceeding the limit rejects with PayloadTooLargeError (HTTP 413).
 * - Invalid JSON rejects with InvalidJsonError (HTTP 400), preserving no partial body.
 * - AbortSignal destroys the stream and rejects with AbortError.
 * Hints:
 * - Count Buffer.byteLength, not string length; concat only after the limit check.
 * - Remove the abort listener in finally; destroy the stream on limit/abort.
 * Trap: `JSON.parse` on a partially read body; `Content-Length` is not trustworthy alone.
 * Run tests: npm run test:exercises -- --test-name-pattern="03-03"
 */

export class PayloadTooLargeError extends Error {
  public override readonly name = 'PayloadTooLargeError';
  public readonly code = 'PAYLOAD_TOO_LARGE';
  public readonly statusCode = 413;

  public constructor(maxBytes: number) {
    super(`Request body exceeds ${maxBytes} bytes`);
  }
}

export class InvalidJsonError extends Error {
  public override readonly name = 'InvalidJsonError';
  public readonly code = 'INVALID_JSON';
  public readonly statusCode = 400;

  public constructor() {
    super('Request body is not valid JSON');
  }
}

export interface ReadJsonOptions {
  readonly maxBytes?: number;
  readonly signal?: AbortSignal;
}

export async function readJsonBody(
  stream: Readable,
  options: ReadJsonOptions = {},
): Promise<unknown> {
  void stream;
  void options;
  throw new NotImplementedError('readJsonBody');
}

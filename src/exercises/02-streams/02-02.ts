import type { Transform } from 'node:stream';
import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 02-02
 * Topic: Transform streams, object mode, protocol errors
 * Java/Spring analogy: a streaming decoder/processor stage; unlike a blocking reader it
 * receives chunks and must handle arbitrary split points.
 * Requirements:
 * - Input: UTF-8 CSV chunks with header `name,amount`, then rows.
 * - Output: object-mode CsvRow with amountMinor as bigint (minor units).
 * - Skip blank lines; reject missing/duplicate header, wrong column count, empty name,
 *   and non-integer/negative amounts. Errors must include the line number.
 * Hints:
 * - readableObjectMode: true; push rows from _transform and _flush.
 * - Use StringDecoder and a carry string exactly like 02-01.
 * Trap: parsing each chunk independently breaks multi-byte and multi-line records.
 * Run tests: npm run test:exercises -- --test-name-pattern="02-02"
 */

export interface CsvRow {
  readonly name: string;
  readonly amountMinor: bigint;
}

export class CsvFormatError extends Error {
  public override readonly name = 'CsvFormatError';
  public readonly code = 'CSV_FORMAT_ERROR';

  public constructor(lineNumber: number, message: string) {
    super(`CSV line ${lineNumber}: ${message}`);
  }
}

export function createCsvTransform(): Transform {
  throw new NotImplementedError('createCsvTransform');
}

import type { Readable } from 'node:stream';
import { NotImplementedError } from '../../shared/not-implemented.js';
import type { CsvRow } from './02-02.js';

/**
 * Exercise 02-04
 * Topic: stream pipeline, backpressure, abort and cleanup
 * Java/Spring analogy: an ingestion pipeline with a bounded queue; pipeline() wires
 * stages and destroys all of them on failure, but you still own cancellation semantics.
 * Requirements:
 * - Read CSV from source, parse with createCsvTransform(), pass rows to async sink.
 * - Preserve backpressure: do not buffer an unbounded number of rows.
 * - Return row count and totalMinor after the source ends successfully.
 * - Propagate source/parser/sink errors; abort rejects with AbortError.
 * Hints:
 * - Use `pipeline` from node:stream/promises with a Writable in objectMode.
 * - Writable highWaterMark should be small (e.g. 1) for row-level backpressure.
 * Trap: collecting all rows into an array before calling sink defeats streaming.
 * Run tests: npm run test:exercises -- --test-name-pattern="02-04"
 */

export interface ImportResult {
  readonly rows: number;
  readonly totalMinor: bigint;
}

export interface ImportOptions {
  readonly signal?: AbortSignal;
}

export async function importCsv(
  source: Readable,
  sink: (row: CsvRow) => Promise<void>,
  options: ImportOptions = {},
): Promise<ImportResult> {
  void source;
  void sink;
  void options;
  throw new NotImplementedError('importCsv');
}

import { Writable, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createCsvTransform, type CsvRow } from '#src/exercises/02-streams/02-02.js';

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
  let rows = 0;
  let totalMinor = 0n;

  const sinkStream = new Writable({
    objectMode: true,
    highWaterMark: 1,
    write(row: CsvRow, _encoding, callback) {
      rows += 1;
      totalMinor += row.amountMinor;
      sink(row).then(
        () => callback(),
        (error: unknown) => callback(error instanceof Error ? error : new Error(String(error))),
      );
    },
  });

  if (options.signal === undefined) {
    await pipeline(source, createCsvTransform(), sinkStream);
  } else {
    await pipeline(source, createCsvTransform(), sinkStream, {
      signal: options.signal,
    });
  }

  return { rows, totalMinor };
}

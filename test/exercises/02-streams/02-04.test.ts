import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import { importCsv } from '../../../src/exercises/02-streams/02-04.js';
import type { CsvRow } from '../../../src/exercises/02-streams/02-02.js';

function csvStream(...chunks: string[]): Readable {
  return Readable.from(chunks.map((chunk) => Buffer.from(chunk)));
}

exerciseTest('02-04 importCsv streams rows to an async sink', async () => {
  const seen: CsvRow[] = [];
  const result = await importCsv(
    csvStream('name,amount\n', 'alice,100\nbob,', '250\n'),
    async (row) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      seen.push(row);
    },
  );

  assert.deepEqual(seen, [
    { name: 'alice', amountMinor: 100n },
    { name: 'bob', amountMinor: 250n },
  ]);
  assert.deepEqual(result, { rows: 2, totalMinor: 350n });
});

exerciseTest('02-04 importCsv propagates parser and sink errors', async () => {
  await expectRejects(
    importCsv(csvStream('name,amount\nbad,-1\n'), async () => undefined),
    /non-negative integer/,
  );
  await expectRejects(
    importCsv(csvStream('name,amount\na,1\n'), async () => {
      throw new Error('sink failed');
    }),
    /sink failed/,
  );
});

exerciseTest('02-04 importCsv propagates source errors', async () => {
  const source = Readable.from(
    (async function* () {
      yield Buffer.from('name,amount\na,1\n');
      throw new Error('source failed');
    })(),
  );

  await expectRejects(
    importCsv(source, async () => undefined),
    /source failed/,
  );
});

exerciseTest('02-04 importCsv aborts and stops the pipeline', async () => {
  const controller = new AbortController();
  const seen: string[] = [];

  await expectRejects(
    importCsv(
      csvStream('name,amount\na,1\nb,2\nc,3\nd,4\n'),
      async (row) => {
        seen.push(row.name);
        controller.abort();
      },
      { signal: controller.signal },
    ),
    (error: unknown) => error instanceof Error && error.name === 'AbortError',
  );

  assert.ok(seen.length <= 1, `expected at most one row, saw ${seen.join(',')}`);
});

exerciseTest('02-04 importCsv rejects an already aborted signal', async () => {
  const controller = new AbortController();
  controller.abort();
  await expectRejects(
    importCsv(csvStream('name,amount\na,1\n'), async () => undefined, {
      signal: controller.signal,
    }),
    (error: unknown) => error instanceof Error && error.name === 'AbortError',
  );
});

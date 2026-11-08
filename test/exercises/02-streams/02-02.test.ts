import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  CsvFormatError,
  createCsvTransform,
  type CsvRow,
} from '../../../src/exercises/02-streams/02-02.js';

async function collectCsv(chunks: readonly Uint8Array[]): Promise<CsvRow[]> {
  const rows: CsvRow[] = [];
  const sink = new Writable({
    objectMode: true,
    write(row: CsvRow, _encoding, callback) {
      rows.push(row);
      callback();
    },
  });

  await pipeline(Readable.from(chunks), createCsvTransform(), sink);
  return rows;
}

exerciseTest('02-02 transforms split CSV chunks into typed rows', async () => {
  const rows = await collectCsv([
    Buffer.from('name,amo'),
    Buffer.from('unt\nalice,100\n'),
    Buffer.from('bob,250\n'),
  ]);

  assert.deepEqual(rows, [
    { name: 'alice', amountMinor: 100n },
    { name: 'bob', amountMinor: 250n },
  ]);
});

exerciseTest('02-02 handles CRLF, BOM, blank lines and multibyte names', async () => {
  const rows = await collectCsv([
    Buffer.from('\uFEFFname,amount\r\n\n'),
    Buffer.from('Алиса,1\r\n'),
  ]);
  assert.deepEqual(rows, [{ name: 'Алиса', amountMinor: 1n }]);
});

exerciseTest('02-02 rejects protocol violations with line numbers', async () => {
  await expectRejects(collectCsv([Buffer.from('amount,name\n1,x\n')]), /expected header/);
  await expectRejects(collectCsv([Buffer.from('name,amount\na,1,2\n')]), /exactly 2 columns/);
  await expectRejects(collectCsv([Buffer.from('name,amount\n,1\n')]), /name is empty/);
  await expectRejects(collectCsv([Buffer.from('name,amount\na,-1\n')]), /non-negative integer/);
  await expectRejects(collectCsv([Buffer.from('name,amount\na,1.5\n')]), CsvFormatError);
});

exerciseTest('02-02 rejects an empty stream without a header', async () => {
  await expectRejects(collectCsv([]), /missing header/);
});

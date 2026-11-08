import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import { LineTooLongError, readLines } from '../../../src/exercises/02-streams/02-01.js';

async function collect(stream: AsyncIterable<Uint8Array>): Promise<string[]> {
  const lines: string[] = [];
  for await (const line of readLines(stream)) {
    lines.push(line);
  }
  return lines;
}

exerciseTest('02-01 readLines handles chunk boundaries, CRLF and final line', async () => {
  const stream = Readable.from([
    Buffer.from('alpha\r\nbe'),
    Buffer.from('ta\ngamma'),
    Buffer.from('\n\nlast'),
  ]);

  assert.deepEqual(await collect(stream), ['alpha', 'beta', 'gamma', '', 'last']);
});

exerciseTest('02-01 readLines preserves UTF-8 across chunks', async () => {
  const bytes = Buffer.from('привет\n🙂\n', 'utf8');
  const chunks = [bytes.subarray(0, 3), bytes.subarray(3, 8), bytes.subarray(8)];
  assert.deepEqual(await collect(Readable.from(chunks)), ['привет', '🙂']);
});

exerciseTest('02-01 readLines rejects overlong lines and bad limits', async () => {
  await expectRejects(
    (async () => {
      for await (const _line of readLines(Readable.from([Buffer.from('12345\n')]), {
        maxLineLength: 4,
      })) {
        // consume
      }
    })(),
    LineTooLongError,
  );

  await expectRejects(
    (async () => {
      for await (const _line of readLines(Readable.from([Buffer.from('x')]), {
        maxLineLength: 0,
      })) {
        // consume
      }
    })(),
    RangeError,
  );
});

exerciseTest('02-01 readLines honors an aborted signal', async () => {
  const controller = new AbortController();
  controller.abort();

  await expectRejects(
    (async () => {
      for await (const _line of readLines(Readable.from([Buffer.from('x\n')]), {
        signal: controller.signal,
      })) {
        // consume
      }
    })(),
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
  );
});

exerciseTest('02-01 readLines handles an empty stream', async () => {
  assert.deepEqual(await collect(Readable.from([])), []);
});

import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import {
  InvalidJsonError,
  PayloadTooLargeError,
  readJsonBody,
} from '../../../src/exercises/03-raw-http/03-03.js';

exerciseTest('03-03 readJsonBody parses JSON split across chunks', async () => {
  const body = JSON.stringify({ name: 'Алиса', amount: 100 });
  const bytes = Buffer.from(body, 'utf8');
  const chunks = [bytes.subarray(0, 5), bytes.subarray(5, 11), bytes.subarray(11)];

  assert.deepEqual(await readJsonBody(Readable.from(chunks)), {
    name: 'Алиса',
    amount: 100,
  });
});

exerciseTest('03-03 readJsonBody treats an empty body as undefined', async () => {
  assert.equal(await readJsonBody(Readable.from([])), undefined);
});

exerciseTest('03-03 readJsonBody enforces the byte limit', async () => {
  const stream = Readable.from([Buffer.from('123'), Buffer.from('456')]);
  await expectRejects(readJsonBody(stream, { maxBytes: 5 }), PayloadTooLargeError);
  assert.equal(stream.isPaused(), true);
});

exerciseTest('03-03 readJsonBody rejects malformed JSON', async () => {
  await expectRejects(readJsonBody(Readable.from([Buffer.from('{ nope')])), InvalidJsonError);
});

exerciseTest('03-03 readJsonBody honors abort before and during reading', async () => {
  const preAborted = new AbortController();
  preAborted.abort();
  await expectRejects(
    readJsonBody(Readable.from([Buffer.from('{}')]), { signal: preAborted.signal }),
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
  );

  const stalled = new Readable({
    read() {
      // never pushes
    },
  });
  const controller = new AbortController();
  const pending = readJsonBody(stalled, { signal: controller.signal });
  controller.abort();

  await expectRejects(
    pending,
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
  );
});

exerciseTest('03-03 readJsonBody validates maxBytes', async () => {
  await expectRejects(readJsonBody(Readable.from([]), { maxBytes: 0 }), RangeError);
});

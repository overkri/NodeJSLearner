import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import { writeAll } from '../../../src/exercises/02-streams/02-03.js';

function collector(): { destination: Writable; output: Buffer[] } {
  const output: Buffer[] = [];
  const destination = new Writable({
    highWaterMark: 2,
    write(chunk: Buffer, _encoding, callback) {
      output.push(chunk);
      callback();
    },
  });
  return { destination, output };
}

exerciseTest('02-03 writeAll writes all bytes and respects ordering', async () => {
  const { destination, output } = collector();
  const bytes = await writeAll(
    destination,
    Readable.from([Buffer.from('ab'), Buffer.from('cd'), Buffer.from('ef')]),
  );

  assert.equal(bytes, 6);
  assert.equal(Buffer.concat(output).toString('utf8'), 'abcdef');
});

exerciseTest('02-03 writeAll waits for drain when the buffer is full', async () => {
  // Probe first so an unimplemented starter is reported as TODO before deferred setup.
  const probe = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  assert.equal(await writeAll(probe, Readable.from([])), 0);

  const writes: string[] = [];
  let release: (() => void) | undefined;
  const destination = new Writable({
    highWaterMark: 1,
    write(chunk: Buffer, _encoding, callback) {
      writes.push(chunk.toString('utf8'));
      release = callback;
    },
  });

  const promise = writeAll(
    destination,
    Readable.from([Buffer.from('a'), Buffer.from('b'), Buffer.from('c')]),
  );
  void promise.catch(() => {
    // Observed at the end of the test; keep an early TODO rejection handled.
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(writes, ['a']);

  release?.();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(writes, ['a', 'b']);

  release?.();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(writes, ['a', 'b', 'c']);

  release?.();
  assert.equal(await promise, 3);
});

exerciseTest('02-03 writeAll rejects on destination error', async () => {
  const destination = new Writable({
    highWaterMark: 1,
    write(_chunk, _encoding, callback) {
      callback(new Error('disk full'));
    },
  });

  await expectRejects(writeAll(destination, Readable.from([Buffer.from('data')])), /disk full/);
});

exerciseTest('02-03 writeAll aborts before and during writing', async () => {
  const preAborted = new AbortController();
  preAborted.abort();
  const { destination: first } = collector();
  await expectRejects(
    writeAll(first, Readable.from([Buffer.from('x')]), { signal: preAborted.signal }),
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
  );

  const controller = new AbortController();
  const destination = new Writable({
    highWaterMark: 1,
    write(_chunk, _encoding, _callback) {
      // Never completes: the abort must break the wait.
    },
  });
  const pending = writeAll(destination, Readable.from([Buffer.from('x')]), {
    signal: controller.signal,
  });
  controller.abort();

  await expectRejects(
    pending,
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
  );
});

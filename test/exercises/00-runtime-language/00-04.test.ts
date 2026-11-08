import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import {
  concatChunks,
  decodeUtf8Strict,
  readAsciiPrefix,
  sha256Hex,
  splitOn,
} from '../../../src/exercises/00-runtime-language/00-04.js';

exerciseTest('00-04 readAsciiPrefix validates bytes and length', () => {
  const input = Buffer.from('ledger', 'ascii');
  assert.equal(readAsciiPrefix(input, 3), 'led');
  assert.equal(readAsciiPrefix(input, 0), '');
  expectThrows(() => readAsciiPrefix(input, -1), RangeError);
  expectThrows(() => readAsciiPrefix(input, input.length + 1), RangeError);
  expectThrows(() => readAsciiPrefix(Buffer.from([0x41, 0xff]), 2), /Non-ASCII/);
});

exerciseTest('00-04 concatChunks copies instead of aliasing', () => {
  const first = Buffer.from('ab');
  const second = Buffer.from('cd');
  const joined = concatChunks([first, second]);

  first[0] = 0x7a;
  assert.equal(joined.toString('utf8'), 'abcd');
  assert.deepEqual(concatChunks([]), Buffer.alloc(0));
});

exerciseTest('00-04 splitOn handles boundaries and returns copies', () => {
  const input = Buffer.from('a|b||c|');
  const delimiter = Buffer.from('|');
  const parts = splitOn(input, delimiter);

  assert.deepEqual(
    parts.map((part) => part.toString('utf8')),
    ['a', 'b', '', 'c', ''],
  );

  input[0] = 0x78;
  assert.equal(parts[0]?.toString('utf8'), 'a');
  expectThrows(() => splitOn(input, Buffer.alloc(0)), /must not be empty/);
  assert.deepEqual(
    splitOn(Buffer.alloc(0), delimiter).map((part) => part.toString('utf8')),
    [''],
  );
});

exerciseTest('00-04 UTF-8 decoding is strict', () => {
  assert.equal(decodeUtf8Strict(Buffer.from('привет', 'utf8')), 'привет');
  expectThrows(() => decodeUtf8Strict(Buffer.from([0xc3, 0x28])), TypeError);
});

exerciseTest('00-04 sha256Hex uses bytes, not characters', () => {
  assert.equal(
    sha256Hex(Buffer.from('abc', 'utf8')),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
  assert.equal(
    sha256Hex(Buffer.from('привет', 'utf8')),
    'e58f1e8c55fa105bdd3f40e5037eb0b039b5998d52c05e6cd98878dd2da5cab2',
  );
});

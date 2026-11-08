import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import {
  parseOptionalMinor,
  summarizeLines,
  type LedgerLine,
} from '../../../src/exercises/00-runtime-language/00-01.js';

exerciseTest('00-01 parseOptionalMinor distinguishes blank, zero and null', () => {
  assert.equal(parseOptionalMinor(null), null);
  assert.equal(parseOptionalMinor(undefined), null);
  assert.equal(parseOptionalMinor('   '), null);
  assert.equal(parseOptionalMinor('0'), 0n);
  assert.equal(parseOptionalMinor('+42'), 42n);
  assert.equal(parseOptionalMinor(' -007 '), -7n);
});

exerciseTest('00-01 parseOptionalMinor rejects non-integer input', () => {
  for (const value of ['1.5', '1e3', '12 34', 'NaN', '0x10', 'Infinity']) {
    expectThrows(() => parseOptionalMinor(value), /Invalid minor units/);
  }
});

exerciseTest('00-01 summarizeLines groups immutable input', () => {
  const lines: LedgerLine[] = [
    { accountId: 'a1', currency: 'USD', amountMinor: 100n },
    { accountId: 'a2', currency: 'EUR', amountMinor: 50n },
    { accountId: 'a1', currency: 'USD', amountMinor: -30n },
  ];
  const snapshot = lines.map((line) => ({ ...line }));

  const summary = summarizeLines(lines);

  assert.equal(summary.totalsByCurrency.get('USD'), 70n);
  assert.equal(summary.totalsByCurrency.get('EUR'), 50n);
  assert.deepEqual([...summary.accountIds], ['a1', 'a2']);
  assert.equal(summary.hasNegative, true);
  assert.deepEqual(lines, snapshot);
});

exerciseTest('00-01 summarizeLines handles duplicates and empty input', () => {
  const empty = summarizeLines([]);
  assert.equal(empty.totalsByCurrency.size, 0);
  assert.equal(empty.accountIds.size, 0);
  assert.equal(empty.hasNegative, false);

  const summary = summarizeLines([
    { accountId: 'same', currency: 'GBP', amountMinor: 1n },
    { accountId: 'same', currency: 'GBP', amountMinor: 2n },
  ]);
  assert.equal(summary.totalsByCurrency.get('GBP'), 3n);
  assert.equal(summary.accountIds.size, 1);
  assert.equal(summary.hasNegative, false);
});

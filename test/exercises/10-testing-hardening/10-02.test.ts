import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import {
  FixedClock,
  SequentialIdGenerator,
} from '../../../src/exercises/10-testing-hardening/10-02.js';

exerciseTest('10-02 FixedClock returns copies and advances deterministically', () => {
  const clock = new FixedClock('2026-11-08T10:00:00.000Z');

  const first = clock.now();
  first.setUTCFullYear(1999);
  assert.equal(clock.now().toISOString(), '2026-11-08T10:00:00.000Z');

  assert.equal(clock.advance(1_500).toISOString(), '2026-11-08T10:00:01.500Z');
  assert.equal(clock.advance(0).toISOString(), '2026-11-08T10:00:01.500Z');
});

exerciseTest('10-02 FixedClock validates input', () => {
  expectThrows(() => new FixedClock('not-a-date'), RangeError);
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  expectThrows(() => clock.advance(-1), RangeError);
  expectThrows(() => clock.advance(1.5), RangeError);
});

exerciseTest('10-02 SequentialIdGenerator is deterministic and monotonic', () => {
  const ids = new SequentialIdGenerator('transfer');
  assert.equal(ids.next(), 'transfer-000001');
  assert.equal(ids.next(), 'transfer-000002');

  const custom = new SequentialIdGenerator('evt', 3);
  assert.equal(custom.next(), 'evt-001');
  assert.equal(custom.next(), 'evt-002');
});

exerciseTest('10-02 SequentialIdGenerator validates configuration', () => {
  expectThrows(() => new SequentialIdGenerator('  '), RangeError);
  expectThrows(() => new SequentialIdGenerator('id', 0), RangeError);
  expectThrows(() => new SequentialIdGenerator('id', 33), RangeError);
});

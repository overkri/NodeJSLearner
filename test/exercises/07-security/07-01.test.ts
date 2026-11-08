import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import {
  parseCreateTransfer,
  RequestValidationError,
} from '../../../src/exercises/07-security/07-01.js';

const fromId = '11111111-1111-4111-8111-111111111111';
const toId = '22222222-2222-4222-8222-222222222222';

exerciseTest('07-01 parseCreateTransfer normalizes amount to minor units', () => {
  assert.deepEqual(
    parseCreateTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: '10.50',
      currency: 'USD',
    }),
    { fromAccountId: fromId, toAccountId: toId, amountMinor: 1_050n, currency: 'USD' },
  );

  assert.equal(
    parseCreateTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: '0.01',
      currency: 'EUR',
    }).amountMinor,
    1n,
  );
  assert.equal(
    parseCreateTransfer({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: '7',
      currency: 'GBP',
    }).amountMinor,
    700n,
  );
});

exerciseTest('07-01 parseCreateTransfer rejects invalid bodies with field paths', () => {
  expectThrows(
    () =>
      parseCreateTransfer({
        fromAccountId: 'not-a-uuid',
        toAccountId: toId,
        amount: '-1.00',
        currency: 'USD',
      }),
    (error: unknown) =>
      error instanceof RequestValidationError &&
      error.issues.some((issue) => issue.startsWith('fromAccountId:')) &&
      error.issues.some((issue) => issue.startsWith('amount:')),
  );

  expectThrows(
    () =>
      parseCreateTransfer({
        fromAccountId: fromId,
        toAccountId: fromId,
        amount: '1.00',
        currency: 'USD',
      }),
    /accounts must differ/,
  );
});

exerciseTest('07-01 parseCreateTransfer rejects zero, floats and unknown fields', () => {
  expectThrows(
    () =>
      parseCreateTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: '0.00',
        currency: 'USD',
      }),
    /greater than zero/,
  );
  expectThrows(
    () =>
      parseCreateTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: '1.001',
        currency: 'USD',
      }),
    /positive decimal/,
  );
  expectThrows(
    () =>
      parseCreateTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: '1.00',
        currency: 'USD',
        admin: true,
      }),
    /Unrecognized key|unrecognized/i,
  );
});

exerciseTest('07-01 parseCreateTransfer rejects non-object and missing fields', () => {
  expectThrows(() => parseCreateTransfer(null), RequestValidationError);
  expectThrows(() => parseCreateTransfer('{}'), RequestValidationError);
  expectThrows(() => parseCreateTransfer({}), RequestValidationError);
});

exerciseTest('07-01 validation errors do not echo secret body values', () => {
  const secret = 'postgres://user:secret@host/db';
  expectThrows(
    () =>
      parseCreateTransfer({
        fromAccountId: secret,
        toAccountId: toId,
        amount: '1.00',
        currency: 'USD',
      }),
    (error: unknown) =>
      error instanceof RequestValidationError && !error.message.includes('secret'),
  );
});

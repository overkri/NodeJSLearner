import 'reflect-metadata';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import { validateTransferBody } from '../../../src/exercises/11-nestjs/11-03.js';

const fromId = '11111111-1111-4111-8111-111111111111';
const toId = '22222222-2222-4222-8222-222222222222';

exerciseTest('11-03 Nest pipe validates and transforms a transfer body', async () => {
  const result = await validateTransferBody({
    fromAccountId: fromId,
    toAccountId: toId,
    amount: '10.50',
    currency: 'USD',
  });

  assert.deepEqual(result, {
    fromAccountId: fromId,
    toAccountId: toId,
    currency: 'USD',
    amountMinor: 1_050n,
  });
});

exerciseTest('11-03 Nest pipe rejects malformed bodies with 400', async () => {
  await expectRejects(
    validateTransferBody({
      fromAccountId: 'nope',
      toAccountId: toId,
      amount: '10.50',
      currency: 'USD',
    }),
    BadRequestException,
  );
  await expectRejects(
    validateTransferBody({
      fromAccountId: fromId,
      toAccountId: fromId,
      amount: '10.50',
      currency: 'USD',
    }),
    BadRequestException,
  );
  await expectRejects(
    validateTransferBody({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: '10.50',
      currency: 'USD',
      admin: true,
    }),
    BadRequestException,
  );
});

exerciseTest('11-03 Nest pipe rejects zero/float amounts', async () => {
  for (const amount of ['0.00', '0', '1.001', '-1.00', 'abc']) {
    await expectRejects(
      validateTransferBody({
        fromAccountId: fromId,
        toAccountId: toId,
        amount,
        currency: 'USD',
      }),
      BadRequestException,
    );
  }
});

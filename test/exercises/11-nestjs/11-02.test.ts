import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { AccountsModule } from '../../../src/exercises/11-nestjs/11-02.js';
import { AccountsService } from '../../../src/exercises/11-nestjs/11-01.js';

exerciseTest('11-02 dynamic module wires and exports the service', async () => {
  const module = await Test.createTestingModule({
    imports: [
      AccountsModule.forRoot({
        async balanceOf() {
          return 777n;
        },
      }),
    ],
  }).compile();

  try {
    const service = module.get(AccountsService);
    assert.equal(await service.balanceOf('a'), 777n);
  } finally {
    await module.close();
  }
});

exerciseTest('11-02 module metadata declares exports and providers', () => {
  const dynamic = AccountsModule.forRoot({
    async balanceOf() {
      return 0n;
    },
  });

  assert.equal(dynamic.module, AccountsModule);
  assert.deepEqual(dynamic.exports, [AccountsService]);
  assert.equal(dynamic.providers?.length, 2);
});

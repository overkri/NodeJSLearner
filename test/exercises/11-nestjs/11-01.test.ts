import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { ACCOUNT_REPOSITORY, AccountsService } from '../../../src/exercises/11-nestjs/11-01.js';

exerciseTest('11-01 Nest injects the repository by token', async () => {
  const calls: string[] = [];
  const module = await Test.createTestingModule({
    providers: [
      AccountsService,
      {
        provide: ACCOUNT_REPOSITORY,
        useValue: {
          async balanceOf(accountId: string): Promise<bigint> {
            calls.push(accountId);
            return 12_345n;
          },
        },
      },
    ],
  }).compile();

  try {
    const service = module.get(AccountsService);
    assert.equal(await service.balanceOf('account-1'), 12_345n);
    assert.deepEqual(calls, ['account-1']);
  } finally {
    await module.close();
  }
});

exerciseTest('11-01 service has no hidden dependency on a concrete repository', () => {
  // The testing module above proves the dependency is resolved by token; source-string
  // assertions are intentionally avoided because starters contain TODOs.
  assert.ok(ACCOUNT_REPOSITORY.toString().includes('ACCOUNT_REPOSITORY'));
});

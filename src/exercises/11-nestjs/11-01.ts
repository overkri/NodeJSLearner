import 'reflect-metadata';
import { Inject, Injectable } from '@nestjs/common';
import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 11-01
 * Topic: NestJS DI with explicit provider tokens
 * Java/Spring analogy: @Service + constructor injection + @Qualifier, but a token can be
 * a Symbol and the container must be explicitly assembled in a testing module.
 * Requirements:
 * - AccountsService is injectable and depends on ACCOUNT_REPOSITORY token.
 * - balanceOf delegates to the repository (bigint minor units).
 * - The service must not create the repository itself.
 * Hints:
 * - `@Inject(ACCOUNT_REPOSITORY)` is required for a non-class token.
 * - Test with Test.createTestingModule providers.
 * Trap: `new AccountsService()` in application code; hiding dependencies in module scope.
 * Run tests: npm run test:exercises -- --test-name-pattern="11-01"
 */

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export interface AccountRepositoryPort {
  balanceOf(accountId: string): Promise<bigint>;
}

@Injectable()
export class AccountsService {
  public constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly repository: AccountRepositoryPort,
  ) {
    void repository;
  }

  public async balanceOf(accountId: string): Promise<bigint> {
    void accountId;
    throw new NotImplementedError('AccountsService.balanceOf');
  }
}

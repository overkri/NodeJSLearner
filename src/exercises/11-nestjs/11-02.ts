import 'reflect-metadata';
import { Module, type DynamicModule } from '@nestjs/common';
import { NotImplementedError } from '../../shared/not-implemented.js';
import { ACCOUNT_REPOSITORY, AccountsService, type AccountRepositoryPort } from './11-01.js';

/**
 * Exercise 11-02
 * Topic: feature module + dynamic module wiring
 * Java/Spring analogy: @Configuration/@Bean/@Import, but module metadata is explicit and
 * a dynamic module lets the caller supply infrastructure adapters.
 * Requirements:
 * - AccountsModule.forRoot(repository) returns a DynamicModule that provides the token,
 *   AccountsService, and exports AccountsService.
 * - Consumers must not depend on ACCOUNT_REPOSITORY directly unless it is exported.
 * Hints:
 * - Return `{ module: AccountsModule, providers, exports }`.
 * - Keep the module global-free; explicit imports are easier to test.
 * Trap: exporting a service without registering its dependency.
 * Run tests: npm run test:exercises -- --test-name-pattern="11-02"
 */

@Module({})
export class AccountsModule {
  public static forRoot(_repository: AccountRepositoryPort): DynamicModule {
    void _repository;
    void ACCOUNT_REPOSITORY;
    void AccountsService;
    throw new NotImplementedError('AccountsModule.forRoot');
  }
}

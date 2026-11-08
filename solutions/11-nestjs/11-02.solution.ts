import 'reflect-metadata';
import { Module, type DynamicModule } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  AccountsService,
  type AccountRepositoryPort,
} from '#src/exercises/11-nestjs/11-01.js';

@Module({})
export class AccountsModule {
  public static forRoot(repository: AccountRepositoryPort): DynamicModule {
    return {
      module: AccountsModule,
      providers: [AccountsService, { provide: ACCOUNT_REPOSITORY, useValue: repository }],
      exports: [AccountsService],
    };
  }
}

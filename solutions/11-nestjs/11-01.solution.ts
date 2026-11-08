import 'reflect-metadata';
import { Inject, Injectable } from '@nestjs/common';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export interface AccountRepositoryPort {
  balanceOf(accountId: string): Promise<bigint>;
}

@Injectable()
export class AccountsService {
  public constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly repository: AccountRepositoryPort,
  ) {}

  public async balanceOf(accountId: string): Promise<bigint> {
    return await this.repository.balanceOf(accountId);
  }
}

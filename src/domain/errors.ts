export class DomainError extends Error {
  public override readonly name: string = 'DomainError';
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export class AccountNotFoundError extends DomainError {
  public override readonly name = 'AccountNotFoundError';

  public constructor(accountId: string) {
    super('ACCOUNT_NOT_FOUND', `Account not found: ${accountId}`);
  }
}

export class InsufficientFundsError extends DomainError {
  public override readonly name = 'InsufficientFundsError';

  public constructor(accountId: string) {
    super('INSUFFICIENT_FUNDS', `Insufficient funds on account: ${accountId}`);
  }
}

export class CurrencyMismatchError extends DomainError {
  public override readonly name = 'CurrencyMismatchError';

  public constructor(expected: string, actual: string) {
    super('CURRENCY_MISMATCH', `Currency mismatch: expected ${expected}, got ${actual}`);
  }
}

export class IdempotencyConflictError extends DomainError {
  public override readonly name = 'IdempotencyConflictError';

  public constructor(key: string) {
    super('IDEMPOTENCY_CONFLICT', `Idempotency key was reused with a different payload: ${key}`);
  }
}

export class ValidationError extends DomainError {
  public override readonly name = 'ValidationError';

  public constructor(message: string) {
    super('VALIDATION_ERROR', message);
  }
}

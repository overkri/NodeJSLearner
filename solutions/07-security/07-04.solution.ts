import type { Principal } from '#src/application/ports/token-verifier.js';

export interface OwnedAccount {
  readonly id: string;
  readonly customerId: string;
}

export class AuthorizationError extends Error {
  public override readonly name = 'AuthorizationError';
  public readonly code = 'FORBIDDEN';
  public readonly statusCode = 403;

  public constructor() {
    super('Forbidden');
  }
}

const ADMIN_SCOPE = 'ledger:admin';

export function hasScope(principal: Principal, scope: string): boolean {
  return principal.scopes.includes(scope);
}

function isAdmin(principal: Principal): boolean {
  return hasScope(principal, ADMIN_SCOPE);
}

export function authorizeAccountRead(principal: Principal, account: OwnedAccount): void {
  if (isAdmin(principal)) {
    return;
  }
  if (!hasScope(principal, 'accounts:read') || principal.subject !== account.customerId) {
    throw new AuthorizationError();
  }
}

export function authorizeTransfer(principal: Principal, source: OwnedAccount): void {
  if (isAdmin(principal)) {
    return;
  }
  if (!hasScope(principal, 'transfers:write') || principal.subject !== source.customerId) {
    throw new AuthorizationError();
  }
}

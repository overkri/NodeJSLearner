import { NotImplementedError } from '../../shared/not-implemented.js';
import type { Principal } from '../../application/ports/token-verifier.js';

/**
 * Exercise 07-04
 * Topic: authorization policy separate from authentication
 * Java/Spring analogy: @PreAuthorize + ownership checks; a valid token is not permission.
 * Requirements:
 * - READ requires scope accounts:read; TRANSFER requires transfers:write.
 * - The principal subject must own the source/read account, unless it has ledger:admin.
 * - ledger:admin bypasses scope and ownership checks.
 * - Failures throw AuthorizationError (403, FORBIDDEN) without leaking account/customer ids.
 * Hints:
 * - Keep policy pure and independent of HTTP; call it after token verification.
 * - Check scopes before ownership and return one generic message.
 * Trap: trusting a customerId/fromAccountId from the request body; confusing 401 and 403.
 * Run tests: npm run test:exercises -- --test-name-pattern="07-04"
 */

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

export function hasScope(principal: Principal, scope: string): boolean {
  void principal;
  void scope;
  throw new NotImplementedError('hasScope');
}

export function authorizeAccountRead(principal: Principal, account: OwnedAccount): void {
  void principal;
  void account;
  throw new NotImplementedError('authorizeAccountRead');
}

export function authorizeTransfer(principal: Principal, source: OwnedAccount): void {
  void principal;
  void source;
  throw new NotImplementedError('authorizeTransfer');
}

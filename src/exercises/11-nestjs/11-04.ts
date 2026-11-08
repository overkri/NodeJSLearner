import 'reflect-metadata';
import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { NotImplementedError } from '../../shared/not-implemented.js';
import type { Principal, TokenVerifier } from '../../application/ports/token-verifier.js';

/**
 * Exercise 11-04
 * Topic: Nest guard for Bearer authentication
 * Java/Spring analogy: a Spring Security filter/authorization manager, but a guard runs
 * after routing and must set the principal explicitly for downstream handlers.
 * Requirements:
 * - JwtAuthGuard reads Authorization, extracts the Bearer token, verifies it.
 * - On success it sets request.principal and returns true.
 * - Missing/invalid token throws Nest UnauthorizedException (401), no token in message.
 * - The guard depends on the TokenVerifier port, not on jose directly.
 * Hints:
 * - `context.switchToHttp().getRequest()` returns the adapter request.
 * - Catch verifier errors and normalize to UnauthorizedException.
 * Trap: returning false (403) instead of throwing 401; logging the token.
 * Run tests: npm run test:exercises -- --test-name-pattern="11-04"
 */

export interface AuthenticatedRequest {
  readonly headers: {
    readonly authorization?: string | string[] | undefined;
  };
  principal?: Principal;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  public constructor(private readonly verifier: TokenVerifier) {
    void verifier;
  }

  public async canActivate(_context: ExecutionContext): Promise<boolean> {
    void _context;
    throw new NotImplementedError('JwtAuthGuard.canActivate');
  }
}

import { NotImplementedError } from '../../shared/not-implemented.js';
import type { Principal, TokenVerifier } from '../../application/ports/token-verifier.js';

/**
 * Exercise 07-05
 * Topic: Bearer token extraction and authentication boundary
 * Java/Spring analogy: BearerTokenAuthenticationFilter; the header format is strict and
 * verification failures must not leak token contents or library errors.
 * Requirements:
 * - extractBearerToken accepts exactly one `Bearer <token>` header (case-insensitive scheme).
 * - Reject missing/duplicate headers, other schemes, empty tokens and tokens > 4096 chars.
 * - authenticate verifies via TokenVerifier and maps any failure to UnauthorizedError (401).
 * - Never log or include the token in an error message.
 * Hints:
 * - Node header values can be string | string[] | undefined.
 * - Validate the scheme and token with an explicit regex/prefix check.
 * Trap: accepting `Basic`, splitting on spaces loosely, echoing the token in 401.
 * Run tests: npm run test:exercises -- --test-name-pattern="07-05"
 */

export class UnauthorizedError extends Error {
  public override readonly name = 'UnauthorizedError';
  public readonly code = 'UNAUTHORIZED';
  public readonly statusCode = 401;

  public constructor() {
    super('Unauthorized');
  }
}

export function extractBearerToken(header: string | readonly string[] | undefined): string {
  void header;
  throw new NotImplementedError('extractBearerToken');
}

export async function authenticate(
  header: string | readonly string[] | undefined,
  verifier: TokenVerifier,
): Promise<Principal> {
  void header;
  void verifier;
  throw new NotImplementedError('authenticate');
}

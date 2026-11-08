import type { JWSAlgorithm, KeyInput } from 'jose';
import { NotImplementedError } from '../../shared/not-implemented.js';
import type { TokenVerifier } from '../../application/ports/token-verifier.js';

/**
 * Exercise 07-03
 * Topic: JWT verification with jose (signature, issuer, audience, expiry)
 * Java/Spring analogy: Spring Security OAuth2 resource server, but verification is an
 * explicit library call; never implement signature checks yourself.
 * Requirements:
 * - createJwtVerifier verifies signature, issuer, audience and expiration.
 * - Map sub -> Principal.subject (required, non-empty); scope claim -> scopes.
 * - scope may be a space-delimited string or an array of strings; absent -> [].
 * - Any failure rejects with TokenVerificationError (401), not a raw jose error.
 * Hints:
 * - Pass algorithms explicitly to prevent algorithm confusion.
 * - Do not log the token or raw jose error details.
 * Trap: jwt.decode without verification; accepting `alg: none`; skipping audience.
 * Run tests: npm run test:exercises -- --test-name-pattern="07-03"
 */

export interface JwtVerifierOptions {
  readonly issuer: string;
  readonly audience: string;
  readonly key: KeyInput;
  readonly algorithms?: readonly JWSAlgorithm[];
}

export class TokenVerificationError extends Error {
  public override readonly name = 'TokenVerificationError';
  public readonly code = 'UNAUTHORIZED';
  public readonly statusCode = 401;

  public constructor() {
    super('Invalid or expired token');
  }
}

export function createJwtVerifier(options: JwtVerifierOptions): TokenVerifier {
  void options;
  throw new NotImplementedError('createJwtVerifier');
}

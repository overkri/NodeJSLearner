import { jwtVerify, type JWSAlgorithm, type KeyInput, type JWTPayload } from 'jose';
import type { Principal, TokenVerifier } from '#src/application/ports/token-verifier.js';

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

function extractScopes(payload: JWTPayload): readonly string[] {
  const scope = payload['scope'];
  if (typeof scope === 'string') {
    return scope.split(' ').filter((item) => item !== '');
  }
  if (Array.isArray(scope)) {
    return scope.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

export function createJwtVerifier(options: JwtVerifierOptions): TokenVerifier {
  const algorithms: JWSAlgorithm[] = [...(options.algorithms ?? ['RS256'])];

  return {
    async verify(token: string): Promise<Principal> {
      try {
        const { payload } = await jwtVerify(token, options.key, {
          issuer: options.issuer,
          audience: options.audience,
          algorithms,
        });
        if (typeof payload.sub !== 'string' || payload.sub === '') {
          throw new TokenVerificationError();
        }
        return { subject: payload.sub, scopes: extractScopes(payload) };
      } catch (error) {
        if (error instanceof TokenVerificationError) {
          throw error;
        }
        throw new TokenVerificationError();
      }
    },
  };
}

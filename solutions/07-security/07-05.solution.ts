import type { Principal, TokenVerifier } from '#src/application/ports/token-verifier.js';

export class UnauthorizedError extends Error {
  public override readonly name = 'UnauthorizedError';
  public readonly code = 'UNAUTHORIZED';
  public readonly statusCode = 401;

  public constructor() {
    super('Unauthorized');
  }
}

const BEARER_PATTERN = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i;

export function extractBearerToken(header: string | readonly string[] | undefined): string {
  if (header === undefined) {
    throw new UnauthorizedError();
  }
  const value = typeof header === 'string' ? header : header.length === 1 ? header[0] : undefined;
  if (value === undefined || value !== value.trim()) {
    throw new UnauthorizedError();
  }

  const match = BEARER_PATTERN.exec(value);
  const token = match?.[1];
  if (token === undefined || token.length === 0 || token.length > 4096) {
    throw new UnauthorizedError();
  }
  return token;
}

export async function authenticate(
  header: string | readonly string[] | undefined,
  verifier: TokenVerifier,
): Promise<Principal> {
  const token = extractBearerToken(header);
  try {
    return await verifier.verify(token);
  } catch {
    throw new UnauthorizedError();
  }
}

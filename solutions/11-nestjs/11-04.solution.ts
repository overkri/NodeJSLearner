import 'reflect-metadata';
import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Principal, TokenVerifier } from '#src/application/ports/token-verifier.js';

export interface AuthenticatedRequest {
  readonly headers: {
    readonly authorization?: string | string[] | undefined;
  };
  principal?: Principal;
}

const BEARER_PATTERN = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i;

function extractToken(header: string | string[] | undefined): string {
  const value = typeof header === 'string' ? header : header?.length === 1 ? header[0] : undefined;
  if (value === undefined || value !== value.trim()) {
    throw new UnauthorizedException('Unauthorized');
  }
  const match = BEARER_PATTERN.exec(value);
  if (match?.[1] === undefined || match[1].length > 4096) {
    throw new UnauthorizedException('Unauthorized');
  }
  return match[1];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  public constructor(private readonly verifier: TokenVerifier) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    try {
      const token = extractToken(request.headers.authorization);
      request.principal = await this.verifier.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }
}

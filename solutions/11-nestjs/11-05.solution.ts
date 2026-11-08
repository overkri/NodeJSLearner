import 'reflect-metadata';
import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Logger } from 'pino';
import { tap, type Observable } from 'rxjs';

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^@\s/]+@/gi, '$1[REDACTED]@')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(
      /(authorization|token|password|secret|api[_-]?key)(["']?\s*[:=]\s*["']?)(?!Bearer\b|\[REDACTED\])[^"'\s&,}]+/gi,
      '$1$2[REDACTED]',
    );
}

export interface TimingInterceptorOptions {
  readonly now?: () => number;
}

export interface AccessLogEvent {
  readonly method: string;
  readonly route: string;
  readonly statusCode: number;
  readonly durationMs: number;
}

interface RequestLike {
  readonly method?: string;
  readonly url?: string;
  readonly route?: { readonly path?: string };
}

interface ResponseLike {
  readonly statusCode?: number;
}

@Injectable()
export class TimingInterceptor implements NestInterceptor {
  public constructor(
    private readonly logger: Pick<Logger, 'info' | 'error'>,
    private readonly options: TimingInterceptorOptions = {},
  ) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = this.options.now ?? Date.now;
    const startedAt = now();
    const http = context.switchToHttp();
    const request = http.getRequest<RequestLike>();
    const response = http.getResponse<ResponseLike>();
    const method = request.method ?? 'UNKNOWN';
    const route = request.route?.path ?? request.url ?? 'unknown';

    return next.handle().pipe(
      tap({
        error: (error: unknown) => {
          this.logger.error(
            {
              method,
              route,
              error: sanitizeErrorMessage(error instanceof Error ? error.message : 'Unknown error'),
            },
            'request failed',
          );
        },
        finalize: () => {
          const event: AccessLogEvent = {
            method,
            route,
            statusCode: response.statusCode ?? 200,
            durationMs: now() - startedAt,
          };
          this.logger.info(event, 'request completed');
        },
      }),
    );
  }
}

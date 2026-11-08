import 'reflect-metadata';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { NotImplementedError } from '../../shared/not-implemented.js';
import type { Logger } from 'pino';
import type { Observable } from 'rxjs';

/**
 * Exercise 11-05
 * Topic: Nest interceptor for timing/access logs
 * Java/Spring analogy: HandlerInterceptor/around advice + Micrometer timer, but Nest
 * interceptors use RxJS and run after guards/pipes.
 * Requirements:
 * - TimingInterceptor logs one access event with method, route template, statusCode and
 *   durationMs after the handler settles (success or error).
 * - On error it also logs a sanitized error event and rethrows.
 * - Route uses request.route.path when available, not the raw URL with ids.
 * - now() is injectable for deterministic duration tests.
 * Hints:
 * - `next.handle().pipe(tap({ next, error, finalize }))`.
 * - `context.switchToHttp().getRequest/getResponse`.
 * Trap: logging raw URL/body/token; measuring before the observable completes.
 * Run tests: npm run test:exercises -- --test-name-pattern="11-05"
 */

export interface TimingInterceptorOptions {
  readonly now?: () => number;
}

export interface AccessLogEvent {
  readonly method: string;
  readonly route: string;
  readonly statusCode: number;
  readonly durationMs: number;
}

@InjectableScope()
export class TimingInterceptor implements NestInterceptor {
  public constructor(
    private readonly logger: Pick<Logger, 'info' | 'error'>,
    private readonly options: TimingInterceptorOptions = {},
  ) {
    void logger;
    void options;
  }

  public intercept(_context: ExecutionContext, _next: CallHandler): Observable<unknown> {
    void _context;
    void _next;
    throw new NotImplementedError('TimingInterceptor.intercept');
  }
}

function InjectableScope(): ClassDecorator {
  // Kept local so the starter compiles without importing Nest's Injectable just for metadata;
  // the solution uses the real @Injectable decorator.
  return () => undefined;
}

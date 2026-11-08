import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 08-02
 * Topic: request-scoped context with AsyncLocalStorage
 * Java/Spring analogy: MDC/RequestContextHolder, but the context follows the async chain
 * rather than a thread; concurrent requests never share it.
 * Requirements:
 * - runWithRequestContext makes a frozen context available inside the callback,
 *   including after awaits and in nested async functions.
 * - getRequestContext returns undefined outside a context.
 * - requireRequestContext throws a clear error outside a context.
 * - Contexts of concurrent requests are isolated.
 * Hints:
 * - `AsyncLocalStorage.run(store, fn)` propagates through Promise continuations.
 * - Do not store mutable request objects or the raw request/headers.
 * Trap: a module-level `let currentContext` — concurrent requests overwrite it.
 * Run tests: npm run test:exercises -- --test-name-pattern="08-02"
 */

export interface RequestContext {
  readonly requestId: string;
  readonly route: string;
  readonly principalId?: string;
}

export function runWithRequestContext<TResult>(
  context: RequestContext,
  callback: () => Promise<TResult>,
): Promise<TResult> {
  void context;
  void callback;
  throw new NotImplementedError('runWithRequestContext');
}

export function getRequestContext(): RequestContext | undefined {
  throw new NotImplementedError('getRequestContext');
}

export function requireRequestContext(): RequestContext {
  throw new NotImplementedError('requireRequestContext');
}

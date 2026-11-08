import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 03-02
 * Topic: middleware composition (onion model)
 * Java/Spring analogy: Filter chain / HandlerInterceptor, but `next()` is a function and
 * code after `await next()` runs on the way back out.
 * Requirements:
 * - composeMiddleware runs middlewares in registration order, then terminal.
 * - Code after `await next()` unwinds in reverse order.
 * - A middleware may short-circuit by not calling next.
 * - Calling next() twice in one middleware rejects with an explicit error.
 * - Sync and async middleware both work; errors propagate to the caller.
 * Hints:
 * - Recursive dispatch(index) with a shared `lastIndex` guard.
 * - Wrap sync throws in Promise.reject.
 * Trap: calling next() without awaiting loses errors and ordering.
 * Run tests: npm run test:exercises -- --test-name-pattern="03-02"
 */

export type Next = () => Promise<void>;
export type Middleware<TContext> = (context: TContext, next: Next) => Promise<void> | void;

export function composeMiddleware<TContext>(
  middlewares: readonly Middleware<TContext>[],
): (context: TContext, terminal?: Next) => Promise<void> {
  void middlewares;
  throw new NotImplementedError('composeMiddleware');
}

import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 05-01
 * Topic: pg.Pool ownership and guaranteed client release
 * Java/Spring analogy: HikariCP connection checkout, but there is no proxy to return the
 * connection for you; every successful connect() must be paired with release().
 * Requirements:
 * - withClient checks out one client and always releases it exactly once.
 * - On success release() is called without an error.
 * - On query failure release(error) is called so pg can discard a broken connection.
 * - A connect() failure must not attempt release.
 * - If release throws while the operation succeeded, that error propagates; while the
 *   operation failed, the original operation error wins.
 * Hints:
 * - try/finally with a flag; distinguish success from failure.
 * - release(err) is not the same as release() in node-postgres.
 * Trap: `const client = await pool.connect(); await query(); client.release();` leaks on throw.
 * Run tests: npm run test:exercises -- --test-name-pattern="05-01"
 */

export interface PoolClientLike {
  release(error?: Error | boolean): void;
}

export interface PoolLike<TClient extends PoolClientLike> {
  connect(): Promise<TClient>;
}

export async function withClient<TClient extends PoolClientLike, TResult>(
  pool: PoolLike<TClient>,
  operation: (client: TClient) => Promise<TResult>,
): Promise<TResult> {
  void pool;
  void operation;
  throw new NotImplementedError('withClient');
}

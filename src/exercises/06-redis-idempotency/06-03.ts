import { NotImplementedError } from '../../shared/not-implemented.js';
import type { CacheLookup } from './06-02.js';

/**
 * Exercise 06-03
 * Topic: idempotency coordinator: cache -> lock -> durable store
 * Java/Spring analogy: a service-level idempotency decorator; Redis is an optimization,
 * PostgreSQL unique constraint/transaction is the final authority.
 * Requirements:
 * - Replay/conflict from cache short-circuits without a lock or durable execution.
 * - Lock contention throws IdempotencyInProgressError (do not run the operation twice).
 * - Re-check cache after acquiring the lock (another request may have completed).
 * - Execute the durable store; cache the result best-effort; release the lock in finally.
 * - A cache failure must not fail a request that the durable store can serve.
 * Hints:
 * - Treat cache get errors as miss; treat cache put errors as non-fatal.
 * - Use a unique lock token and compare-and-delete release.
 * Trap: releasing a lock you did not acquire; caching before the transaction commits.
 * Run tests: npm run test:exercises -- --test-name-pattern="06-03"
 */

export interface IdempotencyCachePort {
  get(key: string, requestHash: string): Promise<CacheLookup>;
  put(key: string, requestHash: string, response: unknown): Promise<void>;
}

export interface LockPort {
  acquire(resource: string, token: string, ttlMs: number): Promise<boolean>;
  release(resource: string, token: string): Promise<boolean>;
}

export interface DurableExecutionResult<T> {
  readonly value: T;
  readonly replayed: boolean;
}

export interface DurableIdempotencyStore {
  execute<T>(
    key: string,
    requestHash: string,
    operation: () => Promise<T>,
  ): Promise<DurableExecutionResult<T>>;
}

export interface IdempotencyCoordinatorOptions {
  readonly lockTtlMs?: number;
  readonly tokenGenerator?: () => string;
}

export class IdempotencyInProgressError extends Error {
  public override readonly name = 'IdempotencyInProgressError';
  public readonly code = 'IDEMPOTENCY_IN_PROGRESS';

  public constructor(key: string) {
    super(`Another request is processing idempotency key: ${key}`);
  }
}

export class IdempotencyCoordinator {
  public constructor(
    private readonly deps: {
      readonly cache: IdempotencyCachePort;
      readonly locks: LockPort;
      readonly store: DurableIdempotencyStore;
    },
    private readonly options: IdempotencyCoordinatorOptions = {},
  ) {
    void deps;
    void options;
    throw new NotImplementedError('IdempotencyCoordinator constructor');
  }

  public async execute<T>(
    key: string,
    requestHash: string,
    operation: () => Promise<T>,
  ): Promise<DurableExecutionResult<T>> {
    void key;
    void requestHash;
    void operation;
    throw new NotImplementedError('IdempotencyCoordinator.execute');
  }
}

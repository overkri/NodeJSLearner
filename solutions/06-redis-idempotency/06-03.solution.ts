import { randomUUID } from 'node:crypto';
import { IdempotencyConflictError } from '#src/domain/errors.js';
import type { CacheLookup } from '#src/exercises/06-redis-idempotency/06-02.js';

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
  private readonly lockTtlMs: number;
  private readonly tokenGenerator: () => string;

  public constructor(
    private readonly deps: {
      readonly cache: IdempotencyCachePort;
      readonly locks: LockPort;
      readonly store: DurableIdempotencyStore;
    },
    private readonly options: IdempotencyCoordinatorOptions = {},
  ) {
    this.lockTtlMs = options.lockTtlMs ?? 10_000;
    if (!Number.isInteger(this.lockTtlMs) || this.lockTtlMs < 100) {
      throw new RangeError(`lockTtlMs must be an integer >= 100: ${this.lockTtlMs}`);
    }
    this.tokenGenerator = options.tokenGenerator ?? randomUUID;
  }

  private async lookupCache(key: string, requestHash: string): Promise<CacheLookup> {
    try {
      return await this.deps.cache.get(key, requestHash);
    } catch {
      return { status: 'miss' };
    }
  }

  private async cacheResult(key: string, requestHash: string, response: unknown): Promise<void> {
    try {
      await this.deps.cache.put(key, requestHash, response);
    } catch {
      // Redis is an accelerator; the durable store remains authoritative.
    }
  }

  public async execute<T>(
    key: string,
    requestHash: string,
    operation: () => Promise<T>,
  ): Promise<DurableExecutionResult<T>> {
    const cached = await this.lookupCache(key, requestHash);
    if (cached.status === 'replay') {
      return { value: cached.response as T, replayed: true };
    }
    if (cached.status === 'conflict') {
      throw new IdempotencyConflictError(key);
    }

    const resource = `idem:${key}`;
    const token = this.tokenGenerator();
    const acquired = await this.deps.locks.acquire(resource, token, this.lockTtlMs);
    if (!acquired) {
      throw new IdempotencyInProgressError(key);
    }

    try {
      const afterLock = await this.lookupCache(key, requestHash);
      if (afterLock.status === 'replay') {
        return { value: afterLock.response as T, replayed: true };
      }
      if (afterLock.status === 'conflict') {
        throw new IdempotencyConflictError(key);
      }

      const result = await this.deps.store.execute(key, requestHash, operation);
      await this.cacheResult(key, requestHash, result.value);
      return result;
    } finally {
      try {
        await this.deps.locks.release(resource, token);
      } catch {
        // TTL will eventually release the lock; do not mask the operation result.
      }
    }
  }
}

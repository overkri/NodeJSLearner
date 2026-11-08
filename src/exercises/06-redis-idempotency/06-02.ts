import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 06-02
 * Topic: Redis idempotency fast path with TTL and corrupt-data handling
 * Java/Spring analogy: a cache in front of an idempotency table; Redis is an accelerator,
 * PostgreSQL remains the final guarantee.
 * Requirements:
 * - get(key, requestHash): miss on absent/corrupt entry; replay on same hash; conflict on
 *   a different hash.
 * - Corrupt values are deleted and treated as miss.
 * - put serializes {version, requestHash, response} with EX ttlSeconds.
 * - Keys are namespaced with idem:cache:v1:; ttl is an integer >= 1.
 * Hints:
 * - Store a version field; never trust JSON from Redis.
 * - Check own property `response` so `null`/false responses are preserved.
 * Trap: `if (!response)` loses valid falsy responses; stale cache without TTL.
 * Run tests: npm run test:exercises -- --test-name-pattern="06-02"
 */

export interface RedisCacheCommands {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { readonly EX: number }): Promise<unknown>;
  del(key: string): Promise<number>;
}

export type CacheLookup =
  | { readonly status: 'miss' }
  | { readonly status: 'replay'; readonly response: unknown }
  | { readonly status: 'conflict' };

export interface CacheOptions {
  readonly ttlSeconds: number;
  readonly keyPrefix?: string;
}

export class RedisIdempotencyCache {
  public constructor(
    private readonly redis: RedisCacheCommands,
    private readonly options: CacheOptions,
  ) {
    void redis;
    void options;
    throw new NotImplementedError('RedisIdempotencyCache constructor');
  }

  public async get(key: string, requestHash: string): Promise<CacheLookup> {
    void key;
    void requestHash;
    throw new NotImplementedError('RedisIdempotencyCache.get');
  }

  public async put(key: string, requestHash: string, response: unknown): Promise<void> {
    void key;
    void requestHash;
    void response;
    throw new NotImplementedError('RedisIdempotencyCache.put');
  }
}

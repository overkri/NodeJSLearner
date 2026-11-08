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

interface CachedValue {
  readonly version: 1;
  readonly requestHash: string;
  readonly response: unknown;
}

function isCachedValue(value: unknown): value is CachedValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record['version'] === 1 &&
    typeof record['requestHash'] === 'string' &&
    Object.hasOwn(record, 'response')
  );
}

function assertKey(value: string, name: string): void {
  if (value.trim() === '' || value.length > 200) {
    throw new Error(`${name} must be 1..200 characters`);
  }
}

export class RedisIdempotencyCache {
  private readonly prefix: string;

  public constructor(
    private readonly redis: RedisCacheCommands,
    private readonly options: CacheOptions,
  ) {
    if (!Number.isInteger(options.ttlSeconds) || options.ttlSeconds < 1) {
      throw new RangeError(`ttlSeconds must be an integer >= 1: ${options.ttlSeconds}`);
    }
    this.prefix = options.keyPrefix ?? 'idem:cache:v1:';
  }

  public async get(key: string, requestHash: string): Promise<CacheLookup> {
    assertKey(key, 'Idempotency key');
    assertKey(requestHash, 'Request hash');
    const cacheKey = `${this.prefix}${key}`;
    const raw = await this.redis.get(cacheKey);
    if (raw === null) {
      return { status: 'miss' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      await this.redis.del(cacheKey);
      return { status: 'miss' };
    }
    if (!isCachedValue(parsed)) {
      await this.redis.del(cacheKey);
      return { status: 'miss' };
    }
    if (parsed.requestHash !== requestHash) {
      return { status: 'conflict' };
    }
    return { status: 'replay', response: parsed.response };
  }

  public async put(key: string, requestHash: string, response: unknown): Promise<void> {
    assertKey(key, 'Idempotency key');
    assertKey(requestHash, 'Request hash');
    const value: CachedValue = { version: 1, requestHash, response };
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new Error('Idempotency response is not JSON-serializable');
    }
    await this.redis.set(`${this.prefix}${key}`, serialized, {
      EX: this.options.ttlSeconds,
    });
  }
}

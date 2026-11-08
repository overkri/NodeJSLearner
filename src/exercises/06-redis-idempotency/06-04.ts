import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 06-04
 * Topic: atomic fixed-window rate limit in Redis (INCR + EXPIRE in Lua)
 * Java/Spring analogy: a distributed RateLimiter; two round trips (INCR then EXPIRE) can
 * leave a key without TTL if the process dies between them.
 * Requirements:
 * - checkRateLimit increments a namespaced key atomically and sets TTL on first hit.
 * - Return allowed, limit, remaining (never negative), resetSeconds.
 * - Validate key 1..200 chars, limit integer >= 1, windowSeconds integer >= 1.
 * - Malformed Redis replies are errors.
 * Hints:
 * - Run INCR and EXPIRE in one Lua script; return {count, ttl}.
 * - Use the Redis TTL as resetSeconds; TTL may be -1 if the key has no expiry.
 * Trap: non-atomic INCR + EXPIRE; trusting a client-provided counter.
 * Run tests: npm run test:exercises -- --test-name-pattern="06-04"
 */

export interface RateLimitRedis {
  eval(
    script: string,
    options: { readonly keys: readonly string[]; readonly arguments: readonly string[] },
  ): Promise<unknown>;
}

export const RATE_LIMIT_SCRIPT =
  'local current = redis.call("incr", KEYS[1]) ' +
  'if current == 1 then redis.call("expire", KEYS[1], ARGV[1]) end ' +
  'local ttl = redis.call("ttl", KEYS[1]) ' +
  'return {current, ttl}';

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetSeconds: number;
}

export async function checkRateLimit(
  redis: RateLimitRedis,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  void redis;
  void key;
  void limit;
  void windowSeconds;
  throw new NotImplementedError('checkRateLimit');
}

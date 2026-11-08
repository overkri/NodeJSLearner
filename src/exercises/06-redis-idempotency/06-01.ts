import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 06-01
 * Topic: Redis atomic lock claim with SET NX PX and compare-and-delete
 * Java/Spring analogy: a distributed lock (SETNX + expire), but release must be atomic;
 * a GET+DEL pair can delete another owner's lock after TTL expiry.
 * Requirements:
 * - lockKey validates/normalizes a resource key and prefixes it with lock:v1:.
 * - acquireLock uses SET key token NX PX ttlMs; true only for "OK".
 * - releaseLock runs Lua compare-and-delete and returns true only if one key was deleted.
 * - Validate non-empty token and integer ttlMs >= 100.
 * Hints:
 * - Redis SET NX is atomic; two clients cannot both receive OK.
 * - The Lua script checks the token before DEL.
 * Trap: GET then DEL in two round trips; releasing a lock you no longer own.
 * Run tests: npm run test:exercises -- --test-name-pattern="06-01"
 */

export interface RedisLockCommands {
  set(
    key: string,
    value: string,
    options: { readonly NX: true; readonly PX: number },
  ): Promise<'OK' | null>;
  eval(
    script: string,
    options: { readonly keys: readonly string[]; readonly arguments: readonly string[] },
  ): Promise<unknown>;
}

export const RELEASE_LOCK_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';

export function lockKey(resource: string): string {
  void resource;
  throw new NotImplementedError('lockKey');
}

export async function acquireLock(
  redis: RedisLockCommands,
  resource: string,
  token: string,
  ttlMs: number,
): Promise<boolean> {
  void redis;
  void resource;
  void token;
  void ttlMs;
  throw new NotImplementedError('acquireLock');
}

export async function releaseLock(
  redis: RedisLockCommands,
  resource: string,
  token: string,
): Promise<boolean> {
  void redis;
  void resource;
  void token;
  throw new NotImplementedError('releaseLock');
}

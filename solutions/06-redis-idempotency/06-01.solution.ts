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
  const normalized = resource.trim();
  if (normalized === '' || normalized.length > 200) {
    throw new Error('Lock resource must be 1..200 characters');
  }
  return `lock:v1:${normalized}`;
}

function assertToken(token: string): void {
  if (token.trim() === '' || token.length > 200) {
    throw new Error('Lock token must be 1..200 characters');
  }
}

function assertTtl(ttlMs: number): void {
  if (!Number.isInteger(ttlMs) || ttlMs < 100) {
    throw new Error(`Lock TTL must be an integer >= 100ms: ${ttlMs}`);
  }
}

export async function acquireLock(
  redis: RedisLockCommands,
  resource: string,
  token: string,
  ttlMs: number,
): Promise<boolean> {
  assertToken(token);
  assertTtl(ttlMs);
  const result = await redis.set(lockKey(resource), token, { NX: true, PX: ttlMs });
  return result === 'OK';
}

export async function releaseLock(
  redis: RedisLockCommands,
  resource: string,
  token: string,
): Promise<boolean> {
  assertToken(token);
  const result = await redis.eval(RELEASE_LOCK_SCRIPT, {
    keys: [lockKey(resource)],
    arguments: [token],
  });
  return Number(result) === 1;
}

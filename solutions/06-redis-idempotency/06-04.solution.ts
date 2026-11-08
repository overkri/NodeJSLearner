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

function parseReply(reply: unknown): { count: number; ttl: number } {
  if (!Array.isArray(reply) || reply.length < 2) {
    throw new Error('Unexpected rate limit reply from Redis');
  }
  const count = Number(reply[0]);
  const ttl = Number(reply[1]);
  if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ttl)) {
    throw new Error('Malformed rate limit reply from Redis');
  }
  return { count, ttl };
}

export async function checkRateLimit(
  redis: RateLimitRedis,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const normalizedKey = key.trim();
  if (normalizedKey === '' || normalizedKey.length > 200) {
    throw new Error('Rate limit key must be 1..200 characters');
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`limit must be an integer >= 1: ${limit}`);
  }
  if (!Number.isInteger(windowSeconds) || windowSeconds < 1) {
    throw new RangeError(`windowSeconds must be an integer >= 1: ${windowSeconds}`);
  }

  const reply = await redis.eval(RATE_LIMIT_SCRIPT, {
    keys: [`ratelimit:v1:${normalizedKey}`],
    arguments: [String(windowSeconds)],
  });
  const { count, ttl } = parseReply(reply);

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetSeconds: Math.max(0, ttl),
  };
}

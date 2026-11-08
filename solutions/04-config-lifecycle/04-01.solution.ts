import { z } from 'zod';

export type NodeEnvironment = 'development' | 'test' | 'production';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AppConfig {
  readonly nodeEnv: NodeEnvironment;
  readonly host: string;
  readonly port: number;
  readonly databaseUrl: string;
  readonly redisUrl: string;
  readonly kafkaBrokers: readonly string[];
  readonly logLevel: LogLevel;
  readonly shutdownTimeoutMs: number;
  readonly httpBodyLimitBytes: number;
  readonly idempotencyTtlSeconds: number;
}

export class ConfigError extends Error {
  public override readonly name = 'ConfigError';
  public readonly code = 'CONFIG_ERROR';

  public constructor(issues: readonly string[]) {
    super(`Invalid configuration:\n${issues.join('\n')}`);
  }
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  KAFKA_BROKERS: z.string().min(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1).max(300_000).default(10_000),
  HTTP_BODY_LIMIT_BYTES: z.coerce.number().int().min(1).max(100_000_000).default(1_048_576),
  IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().min(1).default(86_400),
});

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const result = schema.safeParse({
    NODE_ENV: env['NODE_ENV'],
    HOST: env['HOST'],
    PORT: env['PORT'],
    DATABASE_URL: env['DATABASE_URL'],
    REDIS_URL: env['REDIS_URL'],
    KAFKA_BROKERS: env['KAFKA_BROKERS'],
    LOG_LEVEL: env['LOG_LEVEL'],
    SHUTDOWN_TIMEOUT_MS: env['SHUTDOWN_TIMEOUT_MS'],
    HTTP_BODY_LIMIT_BYTES: env['HTTP_BODY_LIMIT_BYTES'],
    IDEMPOTENCY_TTL_SECONDS: env['IDEMPOTENCY_TTL_SECONDS'],
  });

  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
        return `${path}: ${issue.message}`;
      }),
    );
  }

  const brokers = result.data.KAFKA_BROKERS.split(',')
    .map((broker) => broker.trim())
    .filter((broker) => broker.length > 0);
  if (brokers.length === 0) {
    throw new ConfigError(['KAFKA_BROKERS: at least one broker is required']);
  }

  return Object.freeze({
    nodeEnv: result.data.NODE_ENV,
    host: result.data.HOST,
    port: result.data.PORT,
    databaseUrl: result.data.DATABASE_URL,
    redisUrl: result.data.REDIS_URL,
    kafkaBrokers: Object.freeze(brokers),
    logLevel: result.data.LOG_LEVEL,
    shutdownTimeoutMs: result.data.SHUTDOWN_TIMEOUT_MS,
    httpBodyLimitBytes: result.data.HTTP_BODY_LIMIT_BYTES,
    idempotencyTtlSeconds: result.data.IDEMPOTENCY_TTL_SECONDS,
  });
}

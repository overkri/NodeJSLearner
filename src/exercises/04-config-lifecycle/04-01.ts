import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 04-01
 * Topic: environment configuration with Zod, string-to-runtime conversion
 * Java/Spring analogy: @ConfigurationProperties + Bean Validation, except env values are
 * always strings and there is no container to fail fast for you.
 * Requirements:
 * - loadConfig validates process.env-like input and throws ConfigError with field paths.
 * - Required: DATABASE_URL, REDIS_URL, KAFKA_BROKERS (comma-separated, >=1 broker).
 * - Defaults: NODE_ENV=development, HOST=127.0.0.1, PORT=3000, LOG_LEVEL=info,
 *   SHUTDOWN_TIMEOUT_MS=10000, HTTP_BODY_LIMIT_BYTES=1048576,
 *   IDEMPOTENCY_TTL_SECONDS=86400.
 * - Error messages must not include secret values.
 * Hints:
 * - z.coerce.number() converts strings; validate integer/ranges after coercion.
 * - KAFKA_BROKERS: split(','), trim, filter empty.
 * Trap: `process.env.PORT` is a string; `Number('') === 0`.
 * Run tests: npm run test:exercises -- --test-name-pattern="04-01"
 */

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

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  void env;
  throw new NotImplementedError('loadConfig');
}

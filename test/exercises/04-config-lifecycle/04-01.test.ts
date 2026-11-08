import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import { ConfigError, loadConfig } from '../../../src/exercises/04-config-lifecycle/04-01.js';

const requiredEnv = {
  DATABASE_URL: 'postgres://ledger:ledger@localhost:5432/ledger',
  REDIS_URL: 'redis://localhost:6379',
  KAFKA_BROKERS: 'localhost:9092,broker-2:9092',
};

exerciseTest('04-01 loadConfig applies defaults and parses numbers', () => {
  const config = loadConfig(requiredEnv);
  assert.deepEqual(config, {
    nodeEnv: 'development',
    host: '127.0.0.1',
    port: 3000,
    databaseUrl: requiredEnv.DATABASE_URL,
    redisUrl: requiredEnv.REDIS_URL,
    kafkaBrokers: ['localhost:9092', 'broker-2:9092'],
    logLevel: 'info',
    shutdownTimeoutMs: 10_000,
    httpBodyLimitBytes: 1_048_576,
    idempotencyTtlSeconds: 86_400,
  });
});

exerciseTest('04-01 loadConfig accepts overrides and trims brokers', () => {
  const config = loadConfig({
    ...requiredEnv,
    NODE_ENV: 'production',
    HOST: '0.0.0.0',
    PORT: '8080',
    KAFKA_BROKERS: ' kafka:9092 , ,',
    LOG_LEVEL: 'warn',
    SHUTDOWN_TIMEOUT_MS: '5000',
    HTTP_BODY_LIMIT_BYTES: '2048',
    IDEMPOTENCY_TTL_SECONDS: '60',
  });

  assert.equal(config.nodeEnv, 'production');
  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.port, 8080);
  assert.deepEqual(config.kafkaBrokers, ['kafka:9092']);
  assert.equal(config.logLevel, 'warn');
  assert.equal(config.shutdownTimeoutMs, 5000);
  assert.equal(config.httpBodyLimitBytes, 2048);
  assert.equal(config.idempotencyTtlSeconds, 60);
});

exerciseTest('04-01 loadConfig rejects missing and invalid required values', () => {
  expectThrows(
    () => loadConfig({}),
    (error: unknown) => error instanceof ConfigError,
  );
  expectThrows(
    () =>
      loadConfig({
        ...requiredEnv,
        PORT: '0',
        DATABASE_URL: 'not-a-url',
        NODE_ENV: 'staging',
      }),
    (error: unknown) =>
      error instanceof ConfigError &&
      error.message.includes('PORT') &&
      error.message.includes('DATABASE_URL') &&
      error.message.includes('NODE_ENV'),
  );
});

exerciseTest('04-01 loadConfig rejects empty broker lists', () => {
  expectThrows(() => loadConfig({ ...requiredEnv, KAFKA_BROKERS: ' , , ' }), /at least one broker/);
});

exerciseTest('04-01 loadConfig does not leak secret values in errors', () => {
  const secret = 'postgres://admin:super-secret-password@db:5432/ledger';
  expectThrows(
    () => loadConfig({ ...requiredEnv, DATABASE_URL: secret, PORT: 'nope' }),
    (error: unknown) =>
      error instanceof ConfigError &&
      !error.message.includes('super-secret-password') &&
      error.message.includes('PORT'),
  );
});

exerciseTest('04-01 loadConfig returns a frozen config', () => {
  const config = loadConfig(requiredEnv);
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.kafkaBrokers), true);
});

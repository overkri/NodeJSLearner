import type { Logger } from 'pino';
import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 08-01
 * Topic: Pino structured logging with redaction
 * Java/Spring analogy: Logback + MDC, but fields are JSON and redaction paths are explicit;
 * a secret logged once is compromised forever.
 * Requirements:
 * - createLogger returns a Pino logger with the requested level.
 * - Redact top-level authorization/token/password/secret and request header equivalents.
 * - Include service name in the base fields; do not include pid/hostname in tests.
 * - Redaction censor is exactly [REDACTED].
 * Hints:
 * - Pino accepts a writable stream as the second argument for tests.
 * - Redaction happens before serialization; nested paths must be listed explicitly.
 * Trap: logging the whole request/body; relying on log collectors to redact.
 * Run tests: npm run test:exercises -- --test-name-pattern="08-01"
 */

export interface LoggerOptions {
  readonly level: string;
  readonly serviceName?: string;
  readonly stream?: NodeJS.WritableStream;
}

export function createLogger(options: LoggerOptions): Logger {
  void options;
  throw new NotImplementedError('createLogger');
}

import pino, { type Logger } from 'pino';

export interface LoggerOptions {
  readonly level: string;
  readonly serviceName?: string;
  readonly stream?: NodeJS.WritableStream;
}

const REDACT_PATHS = [
  'authorization',
  'token',
  'password',
  'secret',
  'req.headers.authorization',
  'req.headers.cookie',
  'request.headers.authorization',
  'request.headers.cookie',
];

export function createLogger(options: LoggerOptions): Logger {
  const pinoOptions = {
    level: options.level,
    base: { service: options.serviceName ?? 'ledger-api' },
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  return options.stream === undefined ? pino(pinoOptions) : pino(pinoOptions, options.stream);
}

import type { LogLevel } from '#src/exercises/04-config-lifecycle/04-01.js';

export type { LogLevel } from '#src/exercises/04-config-lifecycle/04-01.js';

export interface ServerSettings {
  readonly host: string;
  readonly port: number;
  readonly logLevel: LogLevel;
}

export interface FileSettings {
  readonly host?: string;
  readonly port?: number;
  readonly logLevel?: LogLevel;
}

export class SettingsError extends Error {
  public override readonly name = 'SettingsError';
  public readonly code = 'SETTINGS_ERROR';

  public constructor(message: string) {
    super(message);
  }
}

const LOG_LEVELS: ReadonlySet<string> = new Set(['debug', 'info', 'warn', 'error']);

function parsePort(value: number | string | undefined, source: string): number {
  if (value === undefined) {
    throw new SettingsError(`Missing port in ${source}`);
  }
  if (typeof value === 'string') {
    if (!/^\d+$/.test(value)) {
      throw new SettingsError(`Invalid port in ${source}`);
    }
  }
  const port = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new SettingsError(`Port out of range in ${source}`);
  }
  return port;
}

function parseHost(value: string | undefined, source: string): string {
  if (value === undefined || value.trim() === '') {
    throw new SettingsError(`Host must be non-empty in ${source}`);
  }
  return value.trim();
}

function parseLogLevel(value: string | undefined, source: string): LogLevel {
  if (value === undefined || !LOG_LEVELS.has(value)) {
    throw new SettingsError(`Invalid log level in ${source}`);
  }
  return value as LogLevel;
}

export function resolveSettings(
  defaults: ServerSettings,
  file: FileSettings | undefined,
  env: NodeJS.ProcessEnv,
): ServerSettings {
  const fileHost = file?.host;
  const filePort = file?.port;
  const fileLogLevel = file?.logLevel;
  const envHost = env['HOST'];
  const envPort = env['PORT'];
  const envLogLevel = env['LOG_LEVEL'];

  const host = parseHost(envHost !== undefined ? envHost : (fileHost ?? defaults.host), 'env/file');
  const port = parsePort(envPort !== undefined ? envPort : (filePort ?? defaults.port), 'env/file');
  const logLevel = parseLogLevel(
    envLogLevel !== undefined ? envLogLevel : (fileLogLevel ?? defaults.logLevel),
    'env/file',
  );

  return Object.freeze({ host, port, logLevel });
}

import { NotImplementedError } from '../../shared/not-implemented.js';
import type { LogLevel } from './04-01.js';

/**
 * Exercise 04-02
 * Topic: configuration precedence (defaults < file < env), immutability
 * Java/Spring analogy: application.yml + environment overrides, but merging and type
 * conversion are explicit and must not mutate the source objects.
 * Requirements:
 * - resolveSettings merges defaults, an optional file object and env overrides.
 * - Precedence: env > file > defaults; undefined file fields do not override.
 * - Validate host (non-empty), port (integer 1..65535), log level (debug|info|warn|error).
 * - Return a frozen object; do not mutate inputs.
 * Hints:
 * - Check `env[key] !== undefined`, not truthiness: empty string is an invalid override.
 * - Parse env strings explicitly; do not rely on implicit coercion.
 * Trap: `{ ...defaults, ...file }` lets an explicit `undefined` erase a default.
 * Run tests: npm run test:exercises -- --test-name-pattern="04-02"
 */

export type { LogLevel } from './04-01.js';

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

export function resolveSettings(
  defaults: ServerSettings,
  file: FileSettings | undefined,
  env: NodeJS.ProcessEnv,
): ServerSettings {
  void defaults;
  void file;
  void env;
  throw new NotImplementedError('resolveSettings');
}

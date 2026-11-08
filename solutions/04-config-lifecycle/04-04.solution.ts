import type { EventEmitter } from 'node:events';

export type FatalKind = 'unhandledRejection' | 'uncaughtException';

export interface FatalEvent {
  readonly kind: FatalKind;
  readonly error: Error;
  readonly message: string;
}

export interface ProcessGuardEmitter extends EventEmitter {
  exitCode?: string | number | null | undefined;
}

export interface ProcessGuardOptions {
  readonly onFatal: (event: FatalEvent) => void;
  readonly logger?: (event: { kind: FatalKind; message: string }) => void;
  readonly emitter?: ProcessGuardEmitter;
}

export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^@\s/]+@/gi, '$1[REDACTED]@')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(
      /(authorization|token|password|secret|api[_-]?key)(["']?\s*[:=]\s*["']?)(?!Bearer\b|\[REDACTED\])[^"'\s&,}]+/gi,
      '$1$2[REDACTED]',
    );
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  return new Error(`Non-Error fatal value: ${String(value)}`);
}

export function installProcessGuards(options: ProcessGuardOptions): () => void {
  const emitter: ProcessGuardEmitter = options.emitter ?? process;
  let handled = false;

  const handle = (kind: FatalKind, reason: unknown): void => {
    if (handled) {
      return;
    }
    handled = true;

    const error = toError(reason);
    const message = sanitizeErrorMessage(error.message);

    try {
      options.logger?.({ kind, message });
    } catch {
      // Logging must never mask the fatal path.
    }

    try {
      emitter.exitCode = 1;
    } catch {
      // Some test emitters expose a read-only exitCode.
    }

    try {
      options.onFatal({ kind, error, message });
    } catch {
      // The handler must not recurse into uncaughtException.
    }
  };

  const onUnhandled = (reason: unknown): void => handle('unhandledRejection', reason);
  const onUncaught = (error: unknown): void => handle('uncaughtException', error);

  emitter.on('unhandledRejection', onUnhandled);
  emitter.on('uncaughtException', onUncaught);

  return () => {
    emitter.off('unhandledRejection', onUnhandled);
    emitter.off('uncaughtException', onUncaught);
  };
}

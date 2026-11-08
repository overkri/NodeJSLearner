import type { EventEmitter } from 'node:events';
import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 04-04
 * Topic: unhandledRejection/uncaughtException policy, sanitized fatal logging
 * Java/Spring analogy: an uncaught exception handler + shutdown hook, but Node's default
 * behavior can terminate the process and there is no container to restart it cleanly.
 * Requirements:
 * - installProcessGuards subscribes to unhandledRejection and uncaughtException.
 * - The first fatal event logs a sanitized message, sets exitCode=1 and calls onFatal once.
 * - Later fatal events are ignored (the process is already in an undefined state).
 * - sanitizeErrorMessage removes bearer tokens, secret query/pairs and URL userinfo.
 * - The returned uninstall function removes both listeners.
 * Hints:
 * - Test with a fake EventEmitter, never by crashing the real test process.
 * - Normalize non-Error rejections; logging itself must never throw.
 * Trap: continuing to serve requests after uncaughtException; logging raw tokens.
 * Run tests: npm run test:exercises -- --test-name-pattern="04-04"
 */

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
  void message;
  throw new NotImplementedError('sanitizeErrorMessage');
}

export function installProcessGuards(options: ProcessGuardOptions): () => void {
  void options;
  throw new NotImplementedError('installProcessGuards');
}

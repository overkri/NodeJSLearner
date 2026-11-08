import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 04-03
 * Topic: idempotent graceful shutdown with a global timeout
 * Java/Spring analogy: @PreDestroy + Actuator shutdown, but signal handling, ordering and
 * timeout are application code. A second SIGTERM must not start a second shutdown.
 * Requirements:
 * - ShutdownCoordinator closes tasks in registration order.
 * - shutdown() is idempotent: concurrent/late calls return the same promise/report.
 * - A task failure is recorded and does not stop later tasks.
 * - After timeoutMs the signal is aborted, the current task is recorded as timed out,
 *   and shutdown resolves (does not hang). Later tasks are not started.
 * - State: running -> shutting-down -> stopped.
 * Hints:
 * - Store the shutdown promise before awaiting it.
 * - Race each close() with one timeout promise; attach a catch to late task rejections.
 * Trap: `process.exit()` immediately; `Promise.all` waits forever on a hung task.
 * Run tests: npm run test:exercises -- --test-name-pattern="04-03"
 */

export type ShutdownState = 'running' | 'shutting-down' | 'stopped';

export interface ShutdownTask {
  readonly name: string;
  close(signal: AbortSignal): Promise<void>;
}

export interface ShutdownFailure {
  readonly name: string;
  readonly error: Error;
}

export interface ShutdownReport {
  readonly reason: string;
  readonly durationMs: number;
  readonly timedOut: boolean;
  readonly failures: readonly ShutdownFailure[];
}

export interface ShutdownEvent {
  readonly type:
    | 'shutdown:start'
    | 'task:start'
    | 'task:done'
    | 'task:failed'
    | 'shutdown:timeout'
    | 'shutdown:done';
  readonly task?: string;
  readonly durationMs?: number;
}

export interface ShutdownOptions {
  readonly timeoutMs: number;
  readonly logger?: (event: ShutdownEvent) => void;
}

export class ShutdownTimeoutError extends Error {
  public override readonly name = 'ShutdownTimeoutError';
  public readonly code = 'SHUTDOWN_TIMEOUT';

  public constructor(timeoutMs: number) {
    super(`Graceful shutdown exceeded ${timeoutMs}ms`);
  }
}

export class ShutdownCoordinator {
  private currentState: ShutdownState = 'running';
  private shutdownPromise: Promise<ShutdownReport> | null = null;

  public constructor(
    private readonly tasks: readonly ShutdownTask[],
    private readonly options: ShutdownOptions,
  ) {
    if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1) {
      throw new RangeError(`timeoutMs must be an integer >= 1: ${options.timeoutMs}`);
    }
  }

  public get state(): ShutdownState {
    return this.currentState;
  }

  public shutdown(reason: string): Promise<ShutdownReport> {
    void reason;
    throw new NotImplementedError('ShutdownCoordinator.shutdown');
  }
}

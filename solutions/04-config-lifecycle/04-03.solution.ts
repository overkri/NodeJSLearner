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
    if (this.shutdownPromise !== null) {
      return this.shutdownPromise;
    }
    this.shutdownPromise = this.run(reason);
    return this.shutdownPromise;
  }

  private log(event: ShutdownEvent): void {
    try {
      this.options.logger?.(event);
    } catch {
      // Logging must never prevent shutdown.
    }
  }

  private async run(reason: string): Promise<ShutdownReport> {
    const startedAt = Date.now();
    this.currentState = 'shutting-down';
    this.log({ type: 'shutdown:start' });

    const controller = new AbortController();
    const failures: ShutdownFailure[] = [];
    let timedOut = false;
    let timeoutReject: ((error: Error) => void) | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutReject = reject;
    });
    void timeoutPromise.catch(() => {
      // The race may lose when a task finishes just before the timer; keep it handled.
    });

    const timer = setTimeout(() => {
      controller.abort();
      timeoutReject?.(new ShutdownTimeoutError(this.options.timeoutMs));
    }, this.options.timeoutMs);

    try {
      for (const task of this.tasks) {
        if (controller.signal.aborted) {
          timedOut = true;
          break;
        }

        this.log({ type: 'task:start', task: task.name });
        const closePromise = Promise.resolve().then(() => task.close(controller.signal));
        void closePromise.catch(() => {
          // The race below observes the error; this prevents a late timeout loser from
          // becoming an unhandled rejection.
        });

        try {
          await Promise.race([closePromise, timeoutPromise]);
          this.log({
            type: 'task:done',
            task: task.name,
            durationMs: Date.now() - startedAt,
          });
        } catch (error) {
          const normalized = error instanceof Error ? error : new Error(String(error));
          failures.push({ name: task.name, error: normalized });
          if (normalized instanceof ShutdownTimeoutError) {
            timedOut = true;
            this.log({ type: 'shutdown:timeout', task: task.name });
            break;
          }
          this.log({ type: 'task:failed', task: task.name });
        }
      }
    } finally {
      clearTimeout(timer);
      this.currentState = 'stopped';
      this.log({ type: 'shutdown:done', durationMs: Date.now() - startedAt });
    }

    return {
      reason,
      durationMs: Date.now() - startedAt,
      timedOut,
      failures,
    };
  }
}

export class TimeoutError extends Error {
  public override readonly name = 'TimeoutError';
  public readonly code = 'TIMEOUT';

  public constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
  }
}

export class OperationCancelledError extends Error {
  public override readonly name = 'OperationCancelledError';
  public readonly code = 'CANCELLED';

  public constructor() {
    super('Operation cancelled');
  }
}

export interface TimeoutOptions {
  readonly signal?: AbortSignal;
}

export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  options: TimeoutOptions = {},
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new RangeError(`timeoutMs must be a finite number >= 0: ${timeoutMs}`);
  }

  const externalSignal = options.signal;
  if (externalSignal?.aborted === true) {
    throw new OperationCancelledError();
  }

  return await new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;

    const cleanup = (): void => {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    };

    const finish = (action: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      action();
    };

    const onExternalAbort = (): void => {
      controller.abort();
      finish(() => reject(new OperationCancelledError()));
    };

    const timer = setTimeout(() => {
      controller.abort();
      finish(() => reject(new TimeoutError(timeoutMs)));
    }, timeoutMs);

    externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

    operation(controller.signal).then(
      (value) => {
        finish(() => resolve(value));
      },
      (error: unknown) => {
        finish(() => reject(toError(error)));
      },
    );
  });
}

export function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  return new Error(`Non-Error thrown: ${String(value)}`);
}

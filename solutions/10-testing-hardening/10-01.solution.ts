export interface WaitForOptions {
  readonly timeoutMs?: number;
  readonly intervalMs?: number;
  readonly now?: () => number;
  readonly sleep?: (delayMs: number) => Promise<void>;
}

export class WaitForTimeoutError extends Error {
  public override readonly name = 'WaitForTimeoutError';
  public readonly code = 'WAIT_FOR_TIMEOUT';

  public constructor(timeoutMs: number, cause?: unknown) {
    super(`Condition not met within ${timeoutMs}ms`, { cause });
  }
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export async function waitFor<T>(
  probe: () => Promise<T | undefined>,
  options: WaitForOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 1_000;
  const intervalMs = options.intervalMs ?? 10;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError(`timeoutMs must be an integer >= 1: ${timeoutMs}`);
  }
  if (!Number.isInteger(intervalMs) || intervalMs < 0) {
    throw new RangeError(`intervalMs must be an integer >= 0: ${intervalMs}`);
  }

  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ??
    ((delayMs: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const deadline = now() + timeoutMs;
  let lastError: unknown;

  for (;;) {
    try {
      const value = await probe();
      if (value !== undefined) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }

    if (now() >= deadline) {
      throw new WaitForTimeoutError(
        timeoutMs,
        lastError === undefined ? undefined : toError(lastError),
      );
    }
    await sleep(intervalMs);
  }
}

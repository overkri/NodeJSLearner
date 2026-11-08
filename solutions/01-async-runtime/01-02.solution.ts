export class AbortOperationError extends Error {
  public override readonly name = 'AbortOperationError';
  public readonly code = 'ABORT_ERR';

  public constructor() {
    super('Operation aborted');
  }
}

export interface MapOptions {
  readonly signal?: AbortSignal;
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
  options: MapOptions = {},
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`limit must be an integer >= 1, received: ${limit}`);
  }

  const signal = options.signal;
  if (signal?.aborted === true) {
    throw new AbortOperationError();
  }

  const source = [...items];
  if (source.length === 0) {
    return [];
  }

  const results = new Array<R>(source.length);
  let nextIndex = 0;
  let aborted = false;
  let failed = false;
  let failure: unknown;

  const onAbort = (): void => {
    aborted = true;
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  const worker = async (): Promise<void> => {
    for (;;) {
      if (aborted || failed) {
        return;
      }
      const index = nextIndex;
      nextIndex += 1;
      if (index >= source.length) {
        return;
      }

      try {
        results[index] = await mapper(source[index] as T, index);
      } catch (error) {
        if (!failed) {
          failed = true;
          failure = error;
        }
        return;
      }
    }
  };

  try {
    const workerCount = Math.min(limit, source.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }

  if (aborted) {
    throw new AbortOperationError();
  }
  if (failed) {
    throw failure;
  }
  return results;
}

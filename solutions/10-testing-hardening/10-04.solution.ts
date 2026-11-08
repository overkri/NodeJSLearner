export interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

export function createDeferred<T>(): Deferred<T> {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason: unknown) => void;
  let settled = false;

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve(value: T): void {
      if (!settled) {
        settled = true;
        resolvePromise(value);
      }
    },
    reject(reason: unknown): void {
      if (!settled) {
        settled = true;
        rejectPromise(reason);
      }
    },
  };
}

export class Barrier {
  private waiters: Array<() => void> = [];
  private released = false;

  public constructor(private readonly count: number) {
    if (!Number.isInteger(count) || count < 1) {
      throw new RangeError(`Barrier count must be an integer >= 1: ${count}`);
    }
  }

  public get waiting(): number {
    return this.waiters.length;
  }

  public wait(): Promise<void> {
    if (this.released) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
      if (this.waiters.length >= this.count) {
        this.release();
      }
    });
  }

  public release(): void {
    if (this.released) {
      return;
    }
    this.released = true;
    const waiters = this.waiters;
    this.waiters = [];
    for (const resolve of waiters) {
      resolve();
    }
  }
}

export interface FailureInjectionOptions {
  readonly failures: number;
  readonly errorFactory?: () => Error;
}

export interface InjectedFailure<TArgs extends unknown[], TResult> {
  run(...args: TArgs): Promise<TResult>;
  attempts(): number;
  failuresRemaining(): number;
  reset(): void;
}

export function injectFailures<TArgs extends unknown[], TResult>(
  operation: (...args: TArgs) => Promise<TResult>,
  options: FailureInjectionOptions,
): InjectedFailure<TArgs, TResult> {
  if (!Number.isInteger(options.failures) || options.failures < 0) {
    throw new RangeError(`failures must be an integer >= 0: ${options.failures}`);
  }

  const errorFactory = options.errorFactory ?? ((): Error => new Error('Injected failure'));
  let attempts = 0;
  let remaining = options.failures;

  return {
    async run(...args: TArgs): Promise<TResult> {
      attempts += 1;
      if (remaining > 0) {
        remaining -= 1;
        throw errorFactory();
      }
      return await Promise.resolve().then(() => operation(...args));
    },
    attempts(): number {
      return attempts;
    },
    failuresRemaining(): number {
      return remaining;
    },
    reset(): void {
      attempts = 0;
      remaining = options.failures;
    },
  };
}

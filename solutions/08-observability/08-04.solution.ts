export interface HealthCheck {
  readonly name: string;
  check(): Promise<void>;
}

export interface HealthCheckResult {
  readonly name: string;
  readonly status: 'up' | 'down';
  readonly durationMs: number;
  readonly error?: 'timeout' | 'check_failed';
}

export interface HealthReport {
  readonly status: 'ok' | 'degraded';
  readonly checks: readonly HealthCheckResult[];
}

export interface HealthOptions {
  readonly timeoutMs?: number;
  readonly now?: () => number;
}

export async function runHealthChecks(
  checks: readonly HealthCheck[],
  options: HealthOptions = {},
): Promise<HealthReport> {
  const timeoutMs = options.timeoutMs ?? 1_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError(`timeoutMs must be an integer >= 1: ${timeoutMs}`);
  }

  const names = new Set<string>();
  for (const check of checks) {
    if (check.name.trim() === '') {
      throw new Error('Health check name must be non-empty');
    }
    if (names.has(check.name)) {
      throw new Error(`Duplicate health check: ${check.name}`);
    }
    names.add(check.name);
  }

  const now = options.now ?? Date.now;

  const results = await Promise.all(
    checks.map(async (healthCheck): Promise<HealthCheckResult> => {
      const startedAt = now();
      let timer: NodeJS.Timeout | undefined;

      const timeout = new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), timeoutMs);
      });

      const operation = Promise.resolve().then(() => healthCheck.check());
      void operation.catch(() => {
        // The race observes the rejection; this keeps late timeouts handled.
      });

      try {
        const outcome = await Promise.race([operation.then((): 'ok' => 'ok'), timeout]);
        return outcome === 'ok'
          ? { name: healthCheck.name, status: 'up', durationMs: now() - startedAt }
          : {
              name: healthCheck.name,
              status: 'down',
              durationMs: now() - startedAt,
              error: 'timeout',
            };
      } catch {
        return {
          name: healthCheck.name,
          status: 'down',
          durationMs: now() - startedAt,
          error: 'check_failed',
        };
      } finally {
        if (timer !== undefined) {
          clearTimeout(timer);
        }
      }
    }),
  );

  return {
    status: results.every((result) => result.status === 'up') ? 'ok' : 'degraded',
    checks: results,
  };
}

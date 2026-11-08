import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 08-04
 * Topic: readiness checks with bounded timeouts and no leaked errors
 * Java/Spring analogy: Actuator HealthIndicator/readiness group, but each dependency check
 * is application code and a hung dependency must not hang the probe.
 * Requirements:
 * - runHealthChecks runs checks in parallel; one failure does not stop others.
 * - Each check is bounded by timeoutMs (default 1000); a timeout is recorded as down.
 * - Report check order matches input; status is ok only if all checks are up.
 * - Error details are generic (timeout/check_failed), not raw driver messages.
 * - Duplicate/empty names and invalid timeout are rejected before running checks.
 * Hints:
 * - Race each check with a timer; clear the timer and attach a catch to the loser.
 * - `Promise.all` preserves input order regardless of completion order.
 * Trap: `await Promise.all(checks)` without timeout; exposing DB error text in /ready.
 * Run tests: npm run test:exercises -- --test-name-pattern="08-04"
 */

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
  void checks;
  void options;
  throw new NotImplementedError('runHealthChecks');
}

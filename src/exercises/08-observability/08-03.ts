import type { Registry } from 'prom-client';
import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 08-03
 * Topic: Prometheus metrics with low-cardinality labels
 * Java/Spring analogy: Micrometer counters/timers, but here every metric and label is
 * registered explicitly; a raw URL label can explode cardinality.
 * Requirements:
 * - createHttpMetrics returns a Registry with:
 *   http_requests_total{method,route,status_code} counter and
 *   http_request_duration_seconds{method,route,status_code} histogram.
 * - observe() validates method/route/status/duration.
 * - Repeated observations of the same labels reuse one series; different statuses create
 *   different series.
 * Hints:
 * - Prometheus labels are strings; status_code should be a string label.
 * - Pass a route template (`/accounts/:id`), never the raw path with ids.
 * Trap: labels userId/accountId/requestId or raw URL — unbounded cardinality.
 * Run tests: npm run test:exercises -- --test-name-pattern="08-03"
 */

export interface HttpObservation {
  readonly method: string;
  readonly route: string;
  readonly statusCode: number;
  readonly durationSeconds: number;
}

export interface HttpMetrics {
  observe(observation: HttpObservation): void;
}

export function createHttpMetrics(): HttpMetrics {
  throw new NotImplementedError('createHttpMetrics');
}

export function getMetricsRegistry(metrics: HttpMetrics): Registry {
  void metrics;
  throw new NotImplementedError('getMetricsRegistry');
}

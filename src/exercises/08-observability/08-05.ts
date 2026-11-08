import type { Registry } from 'prom-client';
import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 08-05
 * Topic: Prometheus exposition and route-label normalization
 * Java/Spring analogy: Actuator /prometheus endpoint + Micrometer URI templating; a raw
 * URI with ids creates new time series per id and eventually kills the registry.
 * Requirements:
 * - normalizeRouteLabel turns numeric/UUID segments into :id while preserving static paths.
 * - renderMetrics returns the registry content type and exposition body.
 * - Invalid paths and registry failures are explicit errors.
 * Hints:
 * - Normalize before recording, not at scrape time; labels are already stored.
 * - Keep the static route shape: /accounts/:id/entries.
 * Trap: `/accounts/${id}` as a label; exposing /metrics on the public internet.
 * Run tests: npm run test:exercises -- --test-name-pattern="08-05"
 */

export interface MetricsResponse {
  readonly contentType: string;
  readonly body: string;
}

export function normalizeRouteLabel(pathname: string): string {
  void pathname;
  throw new NotImplementedError('normalizeRouteLabel');
}

export async function renderMetrics(registry: Registry): Promise<MetricsResponse> {
  void registry;
  throw new NotImplementedError('renderMetrics');
}

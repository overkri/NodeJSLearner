import { Counter, Histogram, Registry } from 'prom-client';

export interface HttpObservation {
  readonly method: string;
  readonly route: string;
  readonly statusCode: number;
  readonly durationSeconds: number;
}

export interface HttpMetrics {
  readonly registry: Registry;
  observe(observation: HttpObservation): void;
}

export function createHttpMetrics(): HttpMetrics {
  const registry = new Registry();
  const requests = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [registry],
  });
  const duration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });

  return {
    registry,
    observe(observation: HttpObservation): void {
      if (!/^[A-Z]+$/.test(observation.method)) {
        throw new Error(`Invalid HTTP method: ${observation.method}`);
      }
      if (!observation.route.startsWith('/') || observation.route.includes('?')) {
        throw new Error(`Route label must be a path template: ${observation.route}`);
      }
      if (
        !Number.isInteger(observation.statusCode) ||
        observation.statusCode < 100 ||
        observation.statusCode > 599
      ) {
        throw new Error(`Invalid status code: ${observation.statusCode}`);
      }
      if (!Number.isFinite(observation.durationSeconds) || observation.durationSeconds < 0) {
        throw new Error(`Invalid duration: ${observation.durationSeconds}`);
      }

      const labels = {
        method: observation.method,
        route: observation.route,
        status_code: String(observation.statusCode),
      };
      requests.inc(labels);
      duration.observe(labels, observation.durationSeconds);
    },
  };
}

export function getMetricsRegistry(metrics: HttpMetrics): Registry {
  return metrics.registry;
}

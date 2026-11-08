import type { Registry } from 'prom-client';

export interface MetricsResponse {
  readonly contentType: string;
  readonly body: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeRouteLabel(pathname: string): string {
  if (!pathname.startsWith('/')) {
    throw new Error(`Route must start with /: ${pathname}`);
  }
  if (pathname.length > 1 && pathname.endsWith('/')) {
    throw new Error(`Route must not end with /: ${pathname}`);
  }

  const segments = pathname.split('/');
  const normalized = segments.map((segment) => {
    if (segment === '') {
      return segment;
    }
    if (/^\d+$/.test(segment) || UUID_PATTERN.test(segment)) {
      return ':id';
    }
    if (segment.length > 64) {
      throw new Error('Route segment is too long for a metric label');
    }
    return segment;
  });
  return normalized.join('/');
}

export async function renderMetrics(registry: Registry): Promise<MetricsResponse> {
  try {
    const body = await registry.metrics();
    return { contentType: registry.contentType, body };
  } catch {
    throw new Error('Failed to render Prometheus metrics');
  }
}

import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import {
  createHttpMetrics,
  getMetricsRegistry,
} from '../../../src/exercises/08-observability/08-03.js';

exerciseTest('08-03 metrics aggregate low-cardinality series', async () => {
  const metrics = createHttpMetrics();

  metrics.observe({
    method: 'GET',
    route: '/accounts/:id',
    statusCode: 200,
    durationSeconds: 0.01,
  });
  metrics.observe({
    method: 'GET',
    route: '/accounts/:id',
    statusCode: 200,
    durationSeconds: 0.02,
  });
  metrics.observe({
    method: 'GET',
    route: '/accounts/:id',
    statusCode: 404,
    durationSeconds: 0.005,
  });

  const text = await getMetricsRegistry(metrics).metrics();
  assert.match(
    text,
    /http_requests_total\{method="GET",route="\/accounts\/:id",status_code="200"\} 2/,
  );
  assert.match(
    text,
    /http_requests_total\{method="GET",route="\/accounts\/:id",status_code="404"\} 1/,
  );
  assert.match(text, /http_request_duration_seconds_bucket/);
  assert.match(text, /http_request_duration_seconds_count\{[^}]*status_code="200"\} 2/);
});

exerciseTest('08-03 metrics validate labels and ignore no observations', async () => {
  const metrics = createHttpMetrics();

  expectThrows(
    () =>
      metrics.observe({
        method: 'get',
        route: '/x',
        statusCode: 200,
        durationSeconds: 1,
      }),
    /Invalid HTTP method/,
  );
  expectThrows(
    () =>
      metrics.observe({
        method: 'GET',
        route: '/accounts/123?debug=1',
        statusCode: 200,
        durationSeconds: 1,
      }),
    /path template/,
  );
  expectThrows(
    () =>
      metrics.observe({
        method: 'GET',
        route: '/x',
        statusCode: 99,
        durationSeconds: 1,
      }),
    /status/,
  );
  expectThrows(
    () =>
      metrics.observe({
        method: 'GET',
        route: '/x',
        statusCode: 200,
        durationSeconds: -1,
      }),
    /duration/,
  );

  const text = await getMetricsRegistry(metrics).metrics();
  assert.equal(text.includes('http_requests_total{'), false);
});

exerciseTest('08-03 each registry is isolated', async () => {
  const first = createHttpMetrics();
  const second = createHttpMetrics();
  first.observe({ method: 'POST', route: '/transfers', statusCode: 201, durationSeconds: 1 });

  assert.match(await getMetricsRegistry(first).metrics(), /status_code="201"/);
  assert.equal((await getMetricsRegistry(second).metrics()).includes('status_code="201"'), false);
});

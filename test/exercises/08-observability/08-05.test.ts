import assert from 'node:assert/strict';
import { Counter, Registry } from 'prom-client';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects, expectThrows } from '../../helpers/assertions.js';
import {
  normalizeRouteLabel,
  renderMetrics,
} from '../../../src/exercises/08-observability/08-05.js';

exerciseTest('08-05 normalizeRouteLabel replaces dynamic segments', () => {
  assert.equal(normalizeRouteLabel('/accounts/:id'), '/accounts/:id');
  assert.equal(normalizeRouteLabel('/accounts/123/entries'), '/accounts/:id/entries');
  assert.equal(
    normalizeRouteLabel('/transfers/550e8400-e29b-41d4-a716-446655440000'),
    '/transfers/:id',
  );
  assert.equal(normalizeRouteLabel('/health'), '/health');
  assert.equal(normalizeRouteLabel('/'), '/');
});

exerciseTest('08-05 normalizeRouteLabel rejects invalid raw routes', () => {
  expectThrows(() => normalizeRouteLabel('accounts/123'), /must start/);
  expectThrows(() => normalizeRouteLabel('/accounts/'), /must not end/);
  expectThrows(() => normalizeRouteLabel(`/${'a'.repeat(65)}`), /too long/);
});

exerciseTest('08-05 renderMetrics exposes registry content', async () => {
  const registry = new Registry();
  const counter = new Counter({
    name: 'ledger_test_total',
    help: 'Test counter',
    labelNames: ['route'] as const,
    registers: [registry],
  });
  counter.inc({ route: '/accounts/:id' });

  const response = await renderMetrics(registry);
  assert.equal(response.contentType, registry.contentType);
  assert.match(response.body, /ledger_test_total\{route="\/accounts\/:id"\} 1/);
});

exerciseTest('08-05 renderMetrics wraps registry failures', async () => {
  const broken = {
    contentType: 'text/plain',
    async metrics(): Promise<string> {
      throw new Error('registry exploded with secret=abc');
    },
  } as unknown as Registry;

  await expectRejects(renderMetrics(broken), (error: unknown) => {
    return error instanceof Error && !error.message.includes('secret');
  });
});

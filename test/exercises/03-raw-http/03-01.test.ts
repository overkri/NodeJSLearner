import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import { Router } from '../../../src/exercises/03-raw-http/03-01.js';

exerciseTest('03-01 Router matches static and parameterized routes', () => {
  const router = new Router<string>();
  router.add('GET', '/health', 'health');
  router.add('GET', '/accounts/:accountId/entries', 'entries');

  assert.deepEqual(router.match('GET', '/health'), {
    handler: 'health',
    params: {},
    pattern: '/health',
  });
  assert.deepEqual(router.match('GET', '/accounts/abc/entries/'), {
    handler: 'entries',
    params: { accountId: 'abc' },
    pattern: '/accounts/:accountId/entries',
  });
  assert.equal(router.match('GET', '/accounts/abc'), null);
});

exerciseTest('03-01 Router decodes params and rejects malformed escapes', () => {
  const router = new Router<string>();
  router.add('GET', '/accounts/:id', 'account');

  assert.deepEqual(router.match('GET', '/accounts/a%20b')?.params, { id: 'a b' });
  assert.equal(router.match('GET', '/accounts/%E0%A4%A'), null);
  assert.equal(router.match('GET', '/accounts/'), null);
});

exerciseTest('03-01 Router reports allowed methods', () => {
  const router = new Router<string>();
  router.add('GET', '/accounts/:id', 'get');
  router.add('POST', '/accounts/:id', 'post');
  router.add('DELETE', '/health', 'delete');

  assert.deepEqual(router.allowedMethods('/accounts/xyz'), ['GET', 'POST']);
  assert.deepEqual(router.allowedMethods('/missing'), []);
});

exerciseTest('03-01 Router rejects invalid and duplicate registrations', () => {
  const router = new Router<string>();
  expectThrows(() => router.add('GET', 'health', 'x'), /must start with/);
  expectThrows(() => router.add('GET', '/a/:id/:id', 'x'), /Duplicate route parameter/);
  router.add('GET', '/a/:id', 'x');
  expectThrows(() => router.add('GET', '/a/:other', 'y'), /Duplicate route/);
});

exerciseTest('03-01 Router uses registration order for overlapping patterns', () => {
  const router = new Router<string>();
  router.add('GET', '/accounts/:id', 'param');
  router.add('GET', '/accounts/me', 'static');

  assert.equal(router.match('GET', '/accounts/me')?.handler, 'param');
});

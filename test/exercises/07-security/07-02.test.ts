import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import {
  applySecurityHeaders,
  CONTENT_SECURITY_POLICY,
  type ResponseHeaders,
} from '../../../src/exercises/07-security/07-02.js';

function fakeHeaders(initial: Record<string, string> = {}): {
  headers: ResponseHeaders;
  values: Map<string, string>;
  removed: string[];
} {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key.toLowerCase(), value]));
  const removed: string[] = [];
  return {
    values,
    removed,
    headers: {
      setHeader(name, value) {
        values.set(name.toLowerCase(), value);
      },
      removeHeader(name) {
        removed.push(name.toLowerCase());
        values.delete(name.toLowerCase());
      },
    },
  };
}

exerciseTest('07-02 applySecurityHeaders sets API hardening headers', () => {
  const { headers, values } = fakeHeaders({
    'x-powered-by': 'Express',
    server: 'nginx',
  });

  applySecurityHeaders(headers);

  assert.equal(values.get('x-content-type-options'), 'nosniff');
  assert.equal(values.get('x-frame-options'), 'DENY');
  assert.equal(values.get('content-security-policy'), CONTENT_SECURITY_POLICY);
  assert.equal(values.get('referrer-policy'), 'no-referrer');
  assert.equal(values.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
  assert.equal(values.get('cross-origin-opener-policy'), 'same-origin');
  assert.equal(values.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(values.get('cache-control'), 'no-store');
  assert.equal(values.has('x-powered-by'), false);
  assert.equal(values.has('server'), false);
  assert.equal(values.has('strict-transport-security'), false);
});

exerciseTest('07-02 applySecurityHeaders sends HSTS only when requested', () => {
  const { headers, values } = fakeHeaders();
  applySecurityHeaders(headers, { hsts: true });
  assert.equal(values.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
});

exerciseTest('07-02 applySecurityHeaders is idempotent', () => {
  const { headers, values } = fakeHeaders();
  applySecurityHeaders(headers);
  const first = [...values.entries()].sort();
  applySecurityHeaders(headers);
  assert.deepEqual([...values.entries()].sort(), first);
});

exerciseTest('07-02 applySecurityHeaders removes prohibited headers', () => {
  const { headers, removed } = fakeHeaders({
    'x-powered-by': 'x',
    server: 'y',
  });
  applySecurityHeaders(headers);
  assert.deepEqual(removed.sort(), ['server', 'x-powered-by']);
});

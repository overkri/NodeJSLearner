import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects, expectThrows } from '../../helpers/assertions.js';
import {
  authenticate,
  extractBearerToken,
  UnauthorizedError,
} from '../../../src/exercises/07-security/07-05.js';

exerciseTest('07-05 extractBearerToken accepts a strict Bearer header', () => {
  assert.equal(extractBearerToken('Bearer abc.def-123_~+/='), 'abc.def-123_~+/=');
  assert.equal(extractBearerToken('bearer token'), 'token');
  assert.equal(extractBearerToken(['Bearer one']), 'one');
});

exerciseTest('07-05 extractBearerToken rejects malformed headers', () => {
  for (const header of [
    undefined,
    '',
    'Bearer',
    'Bearer ',
    'Basic abc',
    'Bearer  two',
    'Bearer a b',
    'Bearer abc\n',
    ['Bearer a', 'Bearer b'],
    [],
  ]) {
    expectThrows(() => extractBearerToken(header), UnauthorizedError);
  }
  expectThrows(() => extractBearerToken(`Bearer ${'a'.repeat(4097)}`), UnauthorizedError);
});

exerciseTest('07-05 authenticate returns the verified principal', async () => {
  const principal = { subject: 'customer-1', scopes: ['accounts:read'] };
  let received = '';
  const result = await authenticate('Bearer token-1', {
    async verify(token) {
      received = token;
      return principal;
    },
  });

  assert.equal(received, 'token-1');
  assert.deepEqual(result, principal);
});

exerciseTest('07-05 authenticate hides verifier failures', async () => {
  await expectRejects(
    authenticate('Bearer secret-token', {
      async verify() {
        throw new Error('jose: signature mismatch for secret-token');
      },
    }),
    (error: unknown) =>
      error instanceof UnauthorizedError &&
      !error.message.includes('secret-token') &&
      !error.message.includes('signature'),
  );
});

exerciseTest('07-05 authenticate rejects before calling the verifier for bad headers', async () => {
  let calls = 0;
  await expectRejects(
    authenticate('Basic abc', {
      async verify() {
        calls += 1;
        return { subject: 'x', scopes: [] };
      },
    }),
    UnauthorizedError,
  );
  assert.equal(calls, 0);
});

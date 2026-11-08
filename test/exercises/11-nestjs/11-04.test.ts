import 'reflect-metadata';
import assert from 'node:assert/strict';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import { JwtAuthGuard, type AuthenticatedRequest } from '../../../src/exercises/11-nestjs/11-04.js';

function contextFor(request: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

exerciseTest('11-04 guard verifies Bearer and sets principal', async () => {
  const request: AuthenticatedRequest = { headers: { authorization: 'Bearer token-1' } };
  const principal = { subject: 'customer-1', scopes: ['transfers:write'] };
  const guard = new JwtAuthGuard({
    async verify(token) {
      assert.equal(token, 'token-1');
      return principal;
    },
  });

  assert.equal(await guard.canActivate(contextFor(request)), true);
  assert.deepEqual(request.principal, principal);
});

exerciseTest('11-04 guard rejects missing and malformed headers', async () => {
  const guard = new JwtAuthGuard({
    async verify() {
      throw new Error('must not be called');
    },
  });

  await expectRejects(guard.canActivate(contextFor({ headers: {} })), UnauthorizedException);
  await expectRejects(
    guard.canActivate(contextFor({ headers: { authorization: 'Basic abc' } })),
    UnauthorizedException,
  );
});

exerciseTest('11-04 guard hides verifier errors and token', async () => {
  const request: AuthenticatedRequest = { headers: { authorization: 'Bearer secret-token' } };
  const guard = new JwtAuthGuard({
    async verify() {
      throw new Error('signature mismatch for secret-token');
    },
  });

  await expectRejects(
    guard.canActivate(contextFor(request)),
    (error: unknown) =>
      error instanceof UnauthorizedException &&
      !JSON.stringify(error.getResponse()).includes('secret-token') &&
      !JSON.stringify(error.getResponse()).includes('signature'),
  );
});

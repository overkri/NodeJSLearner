import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import type { Principal } from '../../../src/application/ports/token-verifier.js';
import {
  authorizeAccountRead,
  authorizeTransfer,
  AuthorizationError,
  hasScope,
} from '../../../src/exercises/07-security/07-04.js';

const account = { id: 'account-1', customerId: 'customer-1' };

function principal(scopes: readonly string[], subject = 'customer-1'): Principal {
  return { subject, scopes };
}

exerciseTest('07-04 owner with scope can read and transfer', () => {
  const owner = principal(['accounts:read', 'transfers:write']);

  authorizeAccountRead(owner, account);
  authorizeTransfer(owner, account);
  assert.equal(hasScope(owner, 'accounts:read'), true);
  assert.equal(hasScope(owner, 'accounts:write'), false);
});

exerciseTest('07-04 missing scope or wrong owner is forbidden', () => {
  expectThrows(() => authorizeAccountRead(principal([]), account), AuthorizationError);
  expectThrows(
    () => authorizeAccountRead(principal(['accounts:read'], 'customer-2'), account),
    AuthorizationError,
  );
  expectThrows(() => authorizeTransfer(principal(['accounts:read']), account), AuthorizationError);
  expectThrows(
    () => authorizeTransfer(principal(['transfers:write'], 'customer-2'), account),
    AuthorizationError,
  );
});

exerciseTest('07-04 admin bypasses scope and ownership', () => {
  const admin = principal(['ledger:admin'], 'ops-user');
  authorizeAccountRead(admin, account);
  authorizeTransfer(admin, account);
});

exerciseTest('07-04 errors do not leak account or customer ids', () => {
  expectThrows(
    () => authorizeTransfer(principal(['transfers:write'], 'customer-2'), account),
    (error: unknown) =>
      error instanceof AuthorizationError &&
      !error.message.includes('account-1') &&
      !error.message.includes('customer-1'),
  );
});

exerciseTest('07-04 token validity is assumed but not proven here', () => {
  // Authorization is pure policy; a caller must verify the JWT before invoking it.
  const empty = principal([]);
  expectThrows(() => authorizeTransfer(empty, account), AuthorizationError);
});

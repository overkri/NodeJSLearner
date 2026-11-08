import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import {
  integrationEnabled,
  integrationSkipReason,
  requireIntegrationEnv,
} from '../../../src/exercises/10-testing-hardening/10-06.js';

exerciseTest('10-06 integrationEnabled requires exactly true', () => {
  assert.equal(integrationEnabled({ RUN_INTEGRATION_TESTS: 'true' }), true);
  assert.equal(integrationEnabled({ RUN_INTEGRATION_TESTS: ' TRUE ' }), true);
  assert.equal(integrationEnabled({ RUN_INTEGRATION_TESTS: 'false' }), false);
  assert.equal(integrationEnabled({ RUN_INTEGRATION_TESTS: '1' }), false);
  assert.equal(integrationEnabled({}), false);
});

exerciseTest('10-06 requireIntegrationEnv returns required values frozen', () => {
  const values = requireIntegrationEnv(['DATABASE_URL', 'REDIS_URL'], {
    DATABASE_URL: 'postgres://localhost/ledger',
    REDIS_URL: 'redis://localhost:6379',
    UNUSED: 'x',
  });

  assert.deepEqual(values, {
    DATABASE_URL: 'postgres://localhost/ledger',
    REDIS_URL: 'redis://localhost:6379',
  });
  assert.equal(Object.isFrozen(values), true);
});

exerciseTest('10-06 missing and blank env names are reported without values', () => {
  expectThrows(
    () =>
      requireIntegrationEnv(['DATABASE_URL', 'KAFKA_BROKERS'], {
        DATABASE_URL: 'postgres://user:secret@localhost/db',
        KAFKA_BROKERS: '   ',
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes('KAFKA_BROKERS') &&
      !error.message.includes('secret'),
  );
});

exerciseTest('10-06 duplicate and empty names are rejected', () => {
  expectThrows(() => requireIntegrationEnv(['']), /non-empty/);
  expectThrows(() => requireIntegrationEnv(['A', 'A']), /Duplicate/);
});

exerciseTest('10-06 skip reason is explicit', () => {
  assert.equal(integrationSkipReason({}), 'RUN_INTEGRATION_TESTS is not "true"');
  assert.equal(integrationSkipReason({ RUN_INTEGRATION_TESTS: 'true' }), false);
});

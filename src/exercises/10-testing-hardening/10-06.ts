import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 10-06
 * Topic: explicit integration-test gates and required environment
 * Java/Spring analogy: @EnabledIfEnvironmentVariable / Testcontainers profile, but the
 * course does not create Compose files; integration is opt-in and fails clearly.
 * Requirements:
 * - integrationEnabled is true only when RUN_INTEGRATION_TESTS is exactly "true"
 *   (case-insensitive, trimmed).
 * - requireIntegrationEnv validates unique non-empty names and throws a message listing
 *   missing names, never their values.
 * - Returns a frozen record of required values; empty values count as missing.
 * - integrationSkipReason returns false when enabled, otherwise a short reason string.
 * Hints:
 * - Do not default required env values in tests; that hides misconfiguration.
 * - Never include secret values in the error.
 * Trap: silently skipping when env is missing; tests that pass without services.
 * Run tests: npm run test:exercises -- --test-name-pattern="10-06"
 */

export function integrationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  void env;
  throw new NotImplementedError('integrationEnabled');
}

export function requireIntegrationEnv(
  names: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): Readonly<Record<string, string>> {
  void names;
  void env;
  throw new NotImplementedError('requireIntegrationEnv');
}

export function integrationSkipReason(env: NodeJS.ProcessEnv = process.env): string | false {
  void env;
  throw new NotImplementedError('integrationSkipReason');
}

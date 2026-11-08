export function integrationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env['RUN_INTEGRATION_TESTS'] ?? '').trim().toLowerCase() === 'true';
}

export function requireIntegrationEnv(
  names: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): Readonly<Record<string, string>> {
  const seen = new Set<string>();
  for (const name of names) {
    if (name.trim() === '') {
      throw new Error('Integration env names must be non-empty');
    }
    if (seen.has(name)) {
      throw new Error(`Duplicate integration env name: ${name}`);
    }
    seen.add(name);
  }

  const missing: string[] = [];
  const values: Record<string, string> = {};
  for (const name of names) {
    const value = env[name];
    if (value === undefined || value.trim() === '') {
      missing.push(name);
    } else {
      values[name] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing integration environment: ${missing.join(', ')}`);
  }
  return Object.freeze(values);
}

export function integrationSkipReason(env: NodeJS.ProcessEnv = process.env): string | false {
  return integrationEnabled(env) ? false : 'RUN_INTEGRATION_TESTS is not "true"';
}

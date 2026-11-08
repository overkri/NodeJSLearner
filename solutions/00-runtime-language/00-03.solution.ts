import path from 'node:path';

interface CliOptions {
  readonly configPath: string;
  readonly port?: number;
  readonly verbose: boolean;
}

const DEFAULT_CONFIG = './ledger.config.json';
const PREVIOUS_VALUE_OPTIONS = new Set(['--config', '--port']);

function parsePort(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Invalid port: ${JSON.stringify(raw)}`);
  }
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Port out of range: ${raw}`);
  }
  return port;
}

export function parseCliArgs(argv: readonly string[]): CliOptions {
  let configPath = DEFAULT_CONFIG;
  let port: number | undefined;
  let verbose = false;
  const seen = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      continue;
    }

    const equalsIndex = token.indexOf('=');
    const option = equalsIndex === -1 ? token : token.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : token.slice(equalsIndex + 1);

    if (option === '--verbose') {
      if (inlineValue !== undefined) {
        throw new Error('--verbose does not take a value');
      }
      if (seen.has(option)) {
        throw new Error('Duplicate option: --verbose');
      }
      seen.add(option);
      verbose = true;
      continue;
    }

    if (option !== '--config' && option !== '--port') {
      throw new Error(`Unknown argument: ${token}`);
    }
    if (seen.has(option)) {
      throw new Error(`Duplicate option: ${option}`);
    }
    seen.add(option);

    let value = inlineValue;
    if (value === undefined) {
      const next = argv[index + 1];
      if (next === undefined || PREVIOUS_VALUE_OPTIONS.has(next) || next.startsWith('--')) {
        throw new Error(`Missing value for ${option}`);
      }
      value = next;
      index += 1;
    }
    if (value === '') {
      throw new Error(`Empty value for ${option}`);
    }

    if (option === '--config') {
      configPath = value;
    } else {
      port = parsePort(value);
    }
  }

  return port === undefined ? { configPath, verbose } : { configPath, port, verbose };
}

export function resolveInside(root: string, userPath: string): string {
  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(resolvedRoot, userPath);
  const relative = path.relative(resolvedRoot, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path escapes root: ${userPath}`);
  }
  return candidate;
}

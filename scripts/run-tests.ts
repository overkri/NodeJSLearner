import { spawn } from 'node:child_process';
import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

type Scope = 'default' | 'exercises' | 'integration';

function parseArgs(args: string[]): {
  scope: Scope;
  strict: boolean;
  passthrough: string[];
} {
  let scope: Scope = 'default';
  let strict = false;
  const passthrough: string[] = [];

  for (const arg of args) {
    if (arg === '--exercises') {
      scope = 'exercises';
    } else if (arg === '--integration') {
      scope = 'integration';
    } else if (arg === '--strict') {
      strict = true;
    } else {
      passthrough.push(arg);
    }
  }

  return { scope, strict, passthrough };
}

async function collectTests(directory: string): Promise<string[]> {
  const absolute = path.join(repoRoot, directory);
  let entries: Dirent[];
  try {
    entries = await readdir(absolute, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  const files: string[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTests(relative)));
    } else if (entry.name.endsWith('.test.ts')) {
      files.push(path.join(repoRoot, relative));
    }
  }

  return files;
}

async function main(): Promise<void> {
  const { scope, strict, passthrough } = parseArgs(process.argv.slice(2));
  const directories =
    scope === 'integration'
      ? ['test/integration']
      : scope === 'exercises'
        ? ['test/exercises']
        : ['test/unit', 'test/exercises'];

  const files: string[] = [];
  for (const directory of directories) {
    files.push(...(await collectTests(directory)));
  }

  if (files.length === 0) {
    throw new Error(`No test files found in: ${directories.join(', ')}`);
  }

  const child = spawn(
    process.execPath,
    [
      '--import',
      'tsx',
      '--test',
      '--test-reporter=spec',
      '--test-concurrency=1',
      ...passthrough,
      ...files,
    ],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...(strict ? { EXERCISE_STRICT: '1' } : {}),
      },
    },
  );

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });

  process.exitCode = exitCode;
}

await main();

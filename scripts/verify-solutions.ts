import { spawn } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface Swap {
  target: string;
  original: string;
}

function parseArgs(args: string[]): { modulePrefix: string | null; passthrough: string[] } {
  let modulePrefix: string | null = null;
  const passthrough: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      continue;
    }
    if (arg === '--module') {
      modulePrefix = args[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith('--module=')) {
      modulePrefix = arg.slice('--module='.length);
    } else {
      passthrough.push(arg);
    }
  }

  return { modulePrefix, passthrough };
}

async function collectSolutions(directory: string): Promise<string[]> {
  const entries = await readdir(path.join(repoRoot, directory), { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSolutions(relative)));
    } else if (entry.name.endsWith('.solution.ts')) {
      files.push(relative);
    }
  }

  return files;
}

function starterPathFor(solutionRelative: string): string {
  const relative = solutionRelative.replace(/^solutions[\\/]/, '');
  const withoutSuffix = relative.replace(/\.solution\.ts$/, '.ts');
  return path.join(repoRoot, 'src', 'exercises', withoutSuffix);
}

async function runTests(passthrough: string[]): Promise<number> {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', 'scripts/run-tests.ts', '--strict', ...passthrough],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    },
  );

  return await new Promise<number>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
}

async function main(): Promise<void> {
  const { modulePrefix, passthrough } = parseArgs(process.argv.slice(2));
  const allSolutions = await collectSolutions('solutions');
  const solutionFiles =
    modulePrefix === null
      ? allSolutions
      : allSolutions.filter((file) => {
          const moduleDirectory = path.basename(path.dirname(file));
          return moduleDirectory.startsWith(modulePrefix);
        });

  if (solutionFiles.length === 0) {
    throw new Error(
      modulePrefix === null
        ? 'No .solution.ts files found under solutions/'
        : `No solutions found for module prefix: ${modulePrefix}`,
    );
  }

  const swaps: Swap[] = [];
  try {
    for (const solutionRelative of solutionFiles) {
      const target = starterPathFor(solutionRelative);
      const original = await readFile(target, 'utf8');
      const solution = await readFile(path.join(repoRoot, solutionRelative), 'utf8');
      swaps.push({ target, original });
      await writeFile(target, solution, 'utf8');
    }

    console.log(`verify:solutions: swapped ${swaps.length} reference solution(s)`);
    const exitCode = await runTests(passthrough);
    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  } finally {
    for (const swap of swaps.reverse()) {
      await writeFile(swap.target, swap.original, 'utf8');
    }
    console.log(`verify:solutions: restored ${swaps.length} starter file(s)`);
  }
}

await main();

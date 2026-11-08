import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const configSchema = z.object({
  name: z.string().min(1).default('ledger'),
  port: z.number().int().min(1).max(65535).default(3000),
  dataFile: z.string().min(1).default('./data/ledger.csv'),
});

export type LedgerCliConfig = z.infer<typeof configSchema>;

export interface ConfigReport {
  readonly config: LedgerCliConfig;
  readonly dataFile: {
    readonly absolutePath: string;
    readonly sizeBytes: number;
    readonly sha256: string;
  };
}

/**
 * Small end-to-end milestone for module 00: read JSON, validate it, resolve a
 * path safely, then read bytes without blocking the event loop.
 */
export async function inspectConfig(
  configPath: string,
  options: { readonly cwd?: string; readonly insideRoot?: string } = {},
): Promise<ConfigReport> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const absoluteConfigPath = path.resolve(cwd, configPath);
  const parsed: unknown = JSON.parse(await readFile(absoluteConfigPath, 'utf8'));
  const config = configSchema.parse(parsed);

  const root = path.resolve(cwd, options.insideRoot ?? '.');
  const dataPath = path.resolve(cwd, config.dataFile);
  const relative = path.relative(root, dataPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`dataFile must stay inside ${root}: ${config.dataFile}`);
  }

  const bytes = await readFile(dataPath);
  return {
    config,
    dataFile: {
      absolutePath: dataPath,
      sizeBytes: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    },
  };
}

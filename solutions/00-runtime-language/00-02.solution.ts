import { readFile } from 'node:fs/promises';
import { z } from 'zod';
type ModuleType = 'module' | 'commonjs';

interface PackageMetadata {
  readonly name: string;
  readonly version: string;
  readonly moduleType: ModuleType;
  readonly engines: Readonly<Record<string, string>>;
  readonly dependencyCount: number;
}

const packageSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  type: z.enum(['module', 'commonjs']).optional(),
  engines: z.record(z.string(), z.string()).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
});

export async function readPackageMetadata(filePath: string): Promise<PackageMetadata> {
  const text = await readFile(filePath, 'utf8');
  const parsed: unknown = JSON.parse(text);
  const pkg = packageSchema.parse(parsed);

  const moduleType: ModuleType = pkg.type ?? 'commonjs';
  return {
    name: pkg.name,
    version: pkg.version,
    moduleType,
    engines: pkg.engines ?? {},
    dependencyCount: Object.keys(pkg.dependencies ?? {}).length,
  };
}

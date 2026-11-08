import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 00-02
 * Topic: ESM, async fs, package.json as untrusted runtime data
 * Java/Spring analogy: `pom.xml` is declarative build input; package.json is also
 * runtime input here, so it must be validated. There is no implicit classpath.
 * Requirements:
 * - Read and validate package.json asynchronously (no sync I/O).
 * - `type` defaults to "commonjs" when absent, as npm does.
 * - Return dependency count and engines; reject malformed JSON/schema.
 * Hints:
 * - `readFile` from `node:fs/promises`; `JSON.parse` returns `any`-like data.
 * - Validate with Zod and let the caller see a descriptive error.
 * Trap: `JSON.parse` succeeds for `null`/`[]`; TypeScript interfaces are erased at runtime.
 * Run tests: npm run test:exercises -- --test-name-pattern="00-02"
 */

export type ModuleType = 'module' | 'commonjs';

export interface PackageMetadata {
  readonly name: string;
  readonly version: string;
  readonly moduleType: ModuleType;
  readonly engines: Readonly<Record<string, string>>;
  readonly dependencyCount: number;
}

export async function readPackageMetadata(filePath: string): Promise<PackageMetadata> {
  void filePath;
  throw new NotImplementedError('readPackageMetadata');
}

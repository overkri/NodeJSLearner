import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 00-03
 * Topic: process arguments, path safety, defaults and explicit failures
 * Java/Spring analogy: a `CommandLineRunner` + `@ConfigurationProperties` parser,
 * but every value arrives as a string and must be validated.
 * Requirements:
 * - Parse --config <path>, --config=<path>, --port <n>, --port=<n>, --verbose.
 * - Defaults: configPath=./ledger.config.json, verbose=false, port omitted.
 * - Reject unknown/duplicate options, missing values, and ports outside 1..65535.
 * - resolveInside(root, userPath) must reject absolute paths and `..` escapes.
 * Hints:
 * - Walk argv by index; consume the next token only when it is not another option.
 * - Compare paths with `path.relative`, not `startsWith`.
 * Trap: `/srv/app-evil` starts with `/srv/app`, so a string prefix check is a path traversal bug.
 * Run tests: npm run test:exercises -- --test-name-pattern="00-03"
 */

export interface CliOptions {
  readonly configPath: string;
  readonly port?: number;
  readonly verbose: boolean;
}

export function parseCliArgs(argv: readonly string[]): CliOptions {
  void argv;
  throw new NotImplementedError('parseCliArgs');
}

export function resolveInside(root: string, userPath: string): string {
  void root;
  void userPath;
  throw new NotImplementedError('resolveInside');
}

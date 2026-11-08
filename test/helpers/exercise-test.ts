import { test, type TestContext } from 'node:test';
import { NotImplementedError } from '../../src/shared/not-implemented.js';

/**
 * Exercise tests are green with `npm test` while an exercise is still a TODO
 * (reported as `todo`). `EXERCISE_STRICT=1` turns every TODO into a failure.
 * `npm run verify:solutions` swaps in reference solutions and sets that flag.
 */
export function exerciseTest(name: string, fn: (t: TestContext) => Promise<void> | void): void {
  void test(name, async (t) => {
    try {
      await fn(t);
    } catch (error) {
      if (error instanceof NotImplementedError && process.env.EXERCISE_STRICT !== '1') {
        t.todo(`Not implemented yet: ${error.message}`);
        return;
      }
      throw error;
    }
  });
}

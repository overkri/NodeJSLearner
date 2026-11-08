import assert from 'node:assert/strict';
import { NotImplementedError } from '../../src/shared/not-implemented.js';

export type ErrorMatcher =
  RegExp | ErrorConstructor | (new (...args: never[]) => Error) | ((error: unknown) => boolean);

function verifyThrown(thrown: unknown, matcher: ErrorMatcher | undefined): void {
  if (thrown instanceof NotImplementedError) {
    throw thrown;
  }
  if (matcher === undefined) {
    return;
  }

  if (matcher instanceof RegExp) {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    assert.match(message, matcher);
    return;
  }

  if (matcher === Error || (typeof matcher === 'function' && matcher.prototype instanceof Error)) {
    assert.ok(
      thrown instanceof (matcher as ErrorConstructor),
      `Expected error instance, received: ${String(thrown)}`,
    );
    return;
  }

  assert.ok((matcher as (error: unknown) => boolean)(thrown), 'Error matcher returned false');
}

/** Like assert.throws, but never hides an unimplemented exercise behind a matcher. */
export function expectThrows(fn: () => unknown, matcher?: ErrorMatcher): void {
  let thrown: unknown;
  let didThrow = false;
  try {
    fn();
  } catch (error) {
    thrown = error;
    didThrow = true;
  }

  if (!didThrow) {
    assert.fail('Expected function to throw');
  }
  verifyThrown(thrown, matcher);
}

/** Like assert.rejects, but never hides an unimplemented exercise behind a matcher. */
export async function expectRejects(
  operation: Promise<unknown> | (() => Promise<unknown>),
  matcher?: ErrorMatcher,
): Promise<unknown> {
  let thrown: unknown;
  let didReject = false;
  try {
    await (typeof operation === 'function' ? operation() : operation);
  } catch (error) {
    thrown = error;
    didReject = true;
  }

  if (!didReject) {
    assert.fail('Expected promise to reject');
  }
  verifyThrown(thrown, matcher);
  return thrown;
}

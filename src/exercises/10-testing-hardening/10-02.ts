import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 10-02
 * Topic: deterministic clock and id generator test doubles
 * Java/Spring analogy: Clock.fixed/AtomicLong in tests, but here they are explicit ports
 * so domain/application code never calls Date.now()/randomUUID() directly.
 * Requirements:
 * - FixedClock(start) returns a copy of the current time; advance(ms) moves it.
 * - SequentialIdGenerator returns prefix + zero-padded counter (width 6 by default).
 * - Both validate constructor/advance inputs and do not share mutable Date instances.
 * Hints:
 * - `new Date(this.current.getTime())` prevents callers mutating the clock.
 * - Keep the counter private; expose next() only.
 * Trap: returning the same Date object; resetting ids between calls in one test.
 * Run tests: npm run test:exercises -- --test-name-pattern="10-02"
 */

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

export class FixedClock implements Clock {
  public constructor(start: Date | string) {
    void start;
    throw new NotImplementedError('FixedClock constructor');
  }

  public now(): Date {
    throw new NotImplementedError('FixedClock.now');
  }

  public advance(delayMs: number): Date {
    void delayMs;
    throw new NotImplementedError('FixedClock.advance');
  }
}

export class SequentialIdGenerator implements IdGenerator {
  public constructor(prefix = 'id', width = 6) {
    void prefix;
    void width;
    throw new NotImplementedError('SequentialIdGenerator constructor');
  }

  public next(): string {
    throw new NotImplementedError('SequentialIdGenerator.next');
  }
}

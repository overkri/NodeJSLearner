export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

export class FixedClock implements Clock {
  private current: Date;

  public constructor(start: Date | string) {
    const date = start instanceof Date ? new Date(start.getTime()) : new Date(start);
    if (Number.isNaN(date.getTime())) {
      throw new RangeError('FixedClock start must be a valid date');
    }
    this.current = date;
  }

  public now(): Date {
    return new Date(this.current.getTime());
  }

  public advance(delayMs: number): Date {
    if (!Number.isInteger(delayMs) || delayMs < 0) {
      throw new RangeError(`advance must be an integer >= 0: ${delayMs}`);
    }
    this.current = new Date(this.current.getTime() + delayMs);
    return this.now();
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  public constructor(
    private readonly prefix = 'id',
    private readonly width = 6,
  ) {
    if (prefix.trim() === '') {
      throw new RangeError('Id prefix must be non-empty');
    }
    if (!Number.isInteger(width) || width < 1 || width > 32) {
      throw new RangeError(`Id width must be an integer 1..32: ${width}`);
    }
  }

  public next(): string {
    this.counter += 1;
    return `${this.prefix}-${String(this.counter).padStart(this.width, '0')}`;
  }
}

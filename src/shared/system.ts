import { randomUUID } from 'node:crypto';
import type { Clock, IdGenerator } from '../application/ports/clock.js';

export const systemClock: Clock = {
  now: () => new Date(),
};

export const uuidIds: IdGenerator = {
  next: () => randomUUID(),
};

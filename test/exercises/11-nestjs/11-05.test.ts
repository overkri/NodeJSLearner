import 'reflect-metadata';
import assert from 'node:assert/strict';
import { firstValueFrom, lastValueFrom, of, throwError } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Logger } from 'pino';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import { TimingInterceptor } from '../../../src/exercises/11-nestjs/11-05.js';

interface LoggedEvent {
  readonly level: 'info' | 'error';
  readonly fields: unknown;
  readonly message: string;
}

function context(statusCode = 200): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'POST', url: '/transfers/123', route: { path: '/transfers' } }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

function handler(value: unknown, error?: Error): CallHandler {
  return {
    handle: () => (error === undefined ? of(value) : throwError(() => error)),
  };
}

function logger(events: LoggedEvent[]): Pick<Logger, 'info' | 'error'> {
  return {
    info(fields: unknown, message: string) {
      events.push({ level: 'info', fields, message });
    },
    error(fields: unknown, message: string) {
      events.push({ level: 'error', fields, message });
    },
  } as unknown as Pick<Logger, 'info' | 'error'>;
}

exerciseTest('11-05 interceptor logs duration and status once', async () => {
  let time = 100;
  const events: LoggedEvent[] = [];
  const interceptor = new TimingInterceptor(logger(events), {
    now: () => {
      const current = time;
      time += 25;
      return current;
    },
  });

  const result = await firstValueFrom(interceptor.intercept(context(201), handler('ok')));

  assert.equal(result, 'ok');
  assert.equal(events.length, 1);
  assert.equal(events[0]?.level, 'info');
  assert.deepEqual(events[0]?.fields, {
    method: 'POST',
    route: '/transfers',
    statusCode: 201,
    durationMs: 25,
  });
});

exerciseTest('11-05 interceptor logs safely on error and rethrows', async () => {
  const events: LoggedEvent[] = [];
  const interceptor = new TimingInterceptor(logger(events), { now: () => 0 });

  await expectRejects(
    lastValueFrom(
      interceptor.intercept(context(500), handler(undefined, new Error('password=secret failed'))),
    ),
    /password=secret failed/,
  );

  assert.equal(events.length, 2);
  assert.equal(events[0]?.level, 'error');
  assert.equal(events[1]?.level, 'info');
  assert.equal(JSON.stringify(events[0]).includes('secret'), false);
});

import 'reflect-metadata';
import assert from 'node:assert/strict';
import { HttpException, type ArgumentsHost } from '@nestjs/common';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { HttpExceptionFilter } from '../../../src/exercises/11-nestjs/11-06.js';

interface Captured {
  status?: number;
  body?: unknown;
  writes: number;
}

function host(
  request: { headers: Record<string, string | string[] | undefined> },
  response: Captured,
  headersSent = false,
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({
        headersSent,
        status(code: number) {
          response.status = code;
          response.writes += 1;
          return this;
        },
        json(body: unknown) {
          response.body = body;
          return this;
        },
      }),
    }),
  } as unknown as ArgumentsHost;
}

exerciseTest('11-06 filter maps HttpException to the envelope', () => {
  const captured: Captured = { writes: 0 };
  const filter = new HttpExceptionFilter();
  filter.catch(
    new HttpException({ code: 'FORBIDDEN', message: 'Nope' }, 403),
    host({ headers: { 'x-request-id': 'req-1' } }, captured),
  );

  assert.equal(captured.status, 403);
  assert.deepEqual(captured.body, {
    error: { code: 'FORBIDDEN', message: 'Nope', requestId: 'req-1' },
  });
});

exerciseTest('11-06 filter joins validation messages and sanitizes secrets', () => {
  const captured: Captured = { writes: 0 };
  const filter = new HttpExceptionFilter();
  filter.catch(
    new HttpException(
      { code: 'VALIDATION_ERROR', message: ['amount invalid', 'password=secret'] },
      400,
    ),
    host({ headers: {} }, captured),
  );

  const body = captured.body as { error: { code: string; message: string; requestId: string } };
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.match(body.error.message, /amount invalid/);
  assert.equal(body.error.message.includes('secret'), false);
  assert.ok(body.error.requestId.length > 0);
});

exerciseTest('11-06 unknown errors become a generic 500', () => {
  const captured: Captured = { writes: 0 };
  const filter = new HttpExceptionFilter();
  filter.catch(new Error('database password=secret exploded'), host({ headers: {} }, captured));

  assert.equal(captured.status, 500);
  assert.deepEqual(captured.body, {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId: (captured.body as { error: { requestId: string } }).error.requestId,
    },
  });
  assert.equal(JSON.stringify(captured).includes('secret'), false);
});

exerciseTest('11-06 filter does not write after headers were sent', () => {
  const captured: Captured = { writes: 0 };
  const filter = new HttpExceptionFilter();
  filter.catch(new Error('late'), host({ headers: {} }, captured, true));

  assert.equal(captured.writes, 0);
  assert.equal(captured.body, undefined);
  assert.equal(captured.status, undefined);
});

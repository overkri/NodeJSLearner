import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { Router } from '../../../src/exercises/03-raw-http/03-01.js';
import { readJsonBody } from '../../../src/exercises/03-raw-http/03-03.js';
import {
  createHttpServer,
  HttpError,
  sendJson,
  type HttpHandler,
} from '../../../src/exercises/03-raw-http/03-04.js';

async function withServer(server: Server, run: (baseUrl: string) => Promise<void>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Expected an ephemeral TCP port');
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error === undefined ? resolve() : reject(error)));
      server.closeAllConnections();
    });
  }
}

function buildRouter(): Router<HttpHandler> {
  const router = new Router<HttpHandler>();
  router.add('GET', '/health', (_request, response, context) => {
    sendJson(response, 200, { status: 'ok', requestId: context.requestId });
  });
  router.add('GET', '/accounts/:accountId', (request, response, context) => {
    sendJson(response, 200, {
      accountId: context.params['accountId'],
      cursor: context.url.searchParams.get('cursor'),
      state: context.state.get('user'),
    });
  });
  router.add('POST', '/echo', async (request, response, context) => {
    const body = await readJsonBody(request, {
      maxBytes: context.bodyLimitBytes,
      signal: context.signal,
    });
    sendJson(response, 201, { body });
  });
  router.add('GET', '/forbidden', () => {
    throw new HttpError(403, 'FORBIDDEN', 'Nope');
  });
  router.add('GET', '/boom', () => {
    throw new Error('secret internal detail');
  });
  router.add('GET', '/headers', (_request, response, context) => {
    response.setHeader('x-custom', 'yes');
    sendJson(response, 200, { requestId: context.requestId });
  });
  return router;
}

exerciseTest('03-04 server routes requests and echoes request id', async () => {
  const server = createHttpServer(buildRouter(), {
    bodyLimitBytes: 64,
    middlewares: [
      (context, next) => {
        context.state.set('user', 'alice');
        return next();
      },
    ],
  });

  await withServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/accounts/a%201?cursor=next`, {
      headers: { 'x-request-id': 'req-123' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-request-id'), 'req-123');
    assert.deepEqual(await response.json(), {
      accountId: 'a 1',
      cursor: 'next',
      state: 'alice',
    });
  });
});

exerciseTest('03-04 server maps 404, 405 and custom errors', async () => {
  const server = createHttpServer(buildRouter());

  await withServer(server, async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/missing`);
    assert.equal(missing.status, 404);
    const missingBody = (await missing.json()) as { error: { code: string; requestId: string } };
    assert.equal(missingBody.error.code, 'NOT_FOUND');
    assert.equal(missingBody.error.requestId, missing.headers.get('x-request-id'));

    const wrongMethod = await fetch(`${baseUrl}/health`, { method: 'POST' });
    assert.equal(wrongMethod.status, 405);
    assert.equal(wrongMethod.headers.get('allow'), 'GET');

    const forbidden = await fetch(`${baseUrl}/forbidden`);
    assert.equal(forbidden.status, 403);
    assert.equal(((await forbidden.json()) as { error: { code: string } }).error.code, 'FORBIDDEN');
  });
});

exerciseTest('03-04 server enforces body limit and JSON errors', async () => {
  const server = createHttpServer(buildRouter(), { bodyLimitBytes: 8 });

  await withServer(server, async (baseUrl) => {
    const tooLarge = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payload: '123456789' }),
    });
    assert.equal(tooLarge.status, 413);
    assert.equal(
      ((await tooLarge.json()) as { error: { code: string } }).error.code,
      'PAYLOAD_TOO_LARGE',
    );

    const invalid = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ nope',
    });
    assert.equal(invalid.status, 400);
  });
});

exerciseTest('03-04 server hides internal error details', async () => {
  const server = createHttpServer(buildRouter());

  await withServer(server, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/boom`);
    assert.equal(response.status, 500);
    const body = (await response.json()) as { error: { code: string; message: string } };
    assert.equal(body.error.code, 'INTERNAL_ERROR');
    assert.equal(body.error.message, 'Internal server error');
    assert.equal(JSON.stringify(body).includes('secret internal detail'), false);
  });
});

exerciseTest('03-04 server accepts valid JSON and preserves custom headers', async () => {
  const server = createHttpServer(buildRouter(), { bodyLimitBytes: 128 });

  await withServer(server, async (baseUrl) => {
    const echo = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hello: 'мир' }),
    });
    assert.equal(echo.status, 201);
    assert.deepEqual(await echo.json(), { body: { hello: 'мир' } });

    const headers = await fetch(`${baseUrl}/headers`);
    assert.equal(headers.headers.get('x-custom'), 'yes');
    assert.ok(headers.headers.get('x-request-id'));
  });
});

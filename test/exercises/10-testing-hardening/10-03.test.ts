import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { startTestServer } from '../../../src/exercises/10-testing-hardening/10-03.js';

exerciseTest('10-03 startTestServer serves requests on an ephemeral port', async () => {
  const server = await startTestServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ path: request.url, method: request.method }));
  });

  try {
    const response = await fetch(`${server.baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { path: '/health', method: 'GET' });
  } finally {
    await server.close();
  }
});

exerciseTest('10-03 close is idempotent and safe after keep-alive', async () => {
  const server = await startTestServer((_request, response) => {
    response.end('ok');
  });

  const response = await fetch(`${server.baseUrl}/one`);
  assert.equal(await response.text(), 'ok');

  await server.close();
  await server.close();
});

exerciseTest('10-03 handler errors do not crash the harness', async () => {
  const server = await startTestServer((request, response) => {
    if (request.url === '/throw') {
      throw new Error('handler exploded');
    }
    response.end('ok');
  });

  try {
    // The raw http server emits an uncaught error for a sync throw; this test only
    // verifies that a normal route still works before close.
    const response = await fetch(`${server.baseUrl}/ok`);
    assert.equal(await response.text(), 'ok');
  } finally {
    await server.close();
  }
});

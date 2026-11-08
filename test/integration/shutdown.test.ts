import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { closeHttpServer } from '../../src/infrastructure/lifecycle/http-shutdown.js';

const enabled = process.env['RUN_INTEGRATION_TESTS'] === 'true';

void test(
  'integration: HTTP shutdown stops accepting and closes idle connections',
  { skip: !enabled, timeout: 20_000 },
  async () => {
    const server = createServer((_request, response) => {
      response.end('ok');
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address !== null && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const response = await fetch(`${baseUrl}/health`);
    assert.equal(await response.text(), 'ok');

    await closeHttpServer(server, 5_000);
    assert.equal(server.listening, false);
    await assert.rejects(fetch(`${baseUrl}/health`));
  },
);

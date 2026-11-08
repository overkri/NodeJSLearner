import 'reflect-metadata';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { createLedgerNestApp, ShutdownService } from '../../../src/exercises/11-nestjs/11-07.js';

exerciseTest('11-07 Nest app serves health and runs shutdown lifecycle', async () => {
  const app = await createLedgerNestApp();
  try {
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });

    const shutdown = app.get(ShutdownService);
    assert.equal(shutdown.closed, false);
    await app.close();
    assert.equal(shutdown.closed, true);
  } finally {
    await app.close();
  }
});

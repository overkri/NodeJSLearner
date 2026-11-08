import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createClient } from 'redis';

const enabled = process.env['RUN_INTEGRATION_TESTS'] === 'true';

void test(
  'integration: Redis atomic lock, TTL and compare-and-delete',
  { skip: !enabled, timeout: 20_000 },
  async () => {
    const url = process.env['REDIS_URL'];
    assert.ok(url, 'REDIS_URL must be set');

    const client = createClient({ url });
    await client.connect();
    const key = `it:lock:${randomUUID()}`;
    const token = randomUUID();

    try {
      assert.equal(await client.set(key, token, { NX: true, PX: 5_000 }), 'OK');
      assert.equal(await client.set(key, randomUUID(), { NX: true, PX: 5_000 }), null);

      const ttl = await client.pTTL(key);
      assert.ok(ttl > 0 && ttl <= 5_000);

      const released = await client.eval(
        'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
        { keys: [key], arguments: [token] },
      );
      assert.equal(Number(released), 1);
      assert.equal(await client.exists(key), 0);
    } finally {
      await client.del(key).catch(() => undefined);
      if (client.isOpen) {
        await client.quit();
      }
    }
  },
);

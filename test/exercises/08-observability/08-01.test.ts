import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { createLogger } from '../../../src/exercises/08-observability/08-01.js';

function capture(): { stream: Writable; lines: string[] } {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString('utf8').trim());
      callback();
    },
  });
  return { stream, lines };
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

exerciseTest('08-01 logger emits structured JSON with service name', async () => {
  const { stream, lines } = capture();
  const logger = createLogger({ level: 'info', serviceName: 'ledger-test', stream });

  logger.info({ transferId: 't1', amountMinor: '100' }, 'transfer created');
  await settle();

  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
  assert.equal(entry['level'], 30);
  assert.equal(entry['msg'], 'transfer created');
  assert.equal(entry['service'], 'ledger-test');
  assert.equal(entry['transferId'], 't1');
  assert.equal(typeof entry['time'], 'string');
});

exerciseTest('08-01 logger redacts secrets before writing', async () => {
  const { stream, lines } = capture();
  const logger = createLogger({ level: 'info', stream });

  logger.info(
    {
      authorization: 'Bearer super-secret-token',
      token: 'abc',
      password: 'hunter2',
      secret: 'shh',
      safe: 'visible',
    },
    'request',
  );
  await settle();

  const serialized = lines.join('\n');
  assert.equal(serialized.includes('super-secret-token'), false);
  assert.equal(serialized.includes('hunter2'), false);
  assert.equal(serialized.includes('"abc"'), false);
  assert.equal(serialized.includes('shh'), false);
  assert.match(serialized, /\[REDACTED\]/);
  assert.equal(serialized.includes('visible'), true);
});

exerciseTest('08-01 logger respects the configured level', async () => {
  const { stream, lines } = capture();
  const logger = createLogger({ level: 'warn', stream });

  logger.debug('hidden');
  logger.info('hidden too');
  logger.warn('visible warning');
  await settle();

  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /visible warning/);
});

import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { exerciseTest } from '../../helpers/exercise-test.js';
import {
  installProcessGuards,
  sanitizeErrorMessage,
  type FatalEvent,
  type ProcessGuardEmitter,
} from '../../../src/exercises/04-config-lifecycle/04-04.js';

class FakeProcess extends EventEmitter implements ProcessGuardEmitter {
  public exitCode: string | number | null = 0;
}

exerciseTest('04-04 sanitizeErrorMessage removes tokens and userinfo', () => {
  const sanitized = sanitizeErrorMessage(
    'Authorization: Bearer abc.def.ghi password=hunter2 ' +
      'url=postgres://admin:super-secret@localhost:5432/ledger secret: "value"',
  );

  assert.equal(sanitized.includes('abc.def.ghi'), false);
  assert.equal(sanitized.includes('hunter2'), false);
  assert.equal(sanitized.includes('super-secret'), false);
  assert.match(sanitized, /Bearer \[REDACTED\]/);
  assert.match(sanitized, /password=\[REDACTED\]/);
  assert.match(sanitized, /postgres:\/\/\[REDACTED\]@localhost/);
  assert.match(sanitized, /secret: "\[REDACTED\]"/);
});

exerciseTest('04-04 first fatal event sets exitCode and stops later events', () => {
  const fake = new FakeProcess();
  const fatal: FatalEvent[] = [];
  const logs: string[] = [];

  const uninstall = installProcessGuards({
    emitter: fake,
    logger: (event) => logs.push(`${event.kind}:${event.message}`),
    onFatal: (event) => fatal.push(event),
  });

  fake.emit('unhandledRejection', 'request failed with token=abc123', Promise.resolve());
  fake.emit('uncaughtException', new Error('second failure'), 'uncaughtException');

  assert.equal(fake.exitCode, 1);
  assert.equal(fatal.length, 1);
  assert.equal(fatal[0]?.kind, 'unhandledRejection');
  assert.equal(fatal[0]?.message.includes('abc123'), false);
  assert.equal(logs.length, 1);
  assert.equal(logs[0]?.includes('abc123'), false);

  uninstall();
  fake.emit('unhandledRejection', 'after uninstall', Promise.resolve());
  assert.equal(fatal.length, 1);
});

exerciseTest('04-04 installProcessGuards is idempotent per fatal event', () => {
  const fake = new FakeProcess();
  let calls = 0;
  const uninstall = installProcessGuards({
    emitter: fake,
    onFatal: () => {
      calls += 1;
      throw new Error('onFatal failed');
    },
  });

  fake.emit('uncaughtException', new Error('boom'));
  assert.equal(calls, 1);
  uninstall();
});

exerciseTest('04-04 logger failures do not break the fatal path', () => {
  const fake = new FakeProcess();
  let called = false;
  const uninstall = installProcessGuards({
    emitter: fake,
    logger: () => {
      throw new Error('logger failed');
    },
    onFatal: () => {
      called = true;
    },
  });

  fake.emit('uncaughtException', new Error('boom'));
  assert.equal(called, true);
  uninstall();
});

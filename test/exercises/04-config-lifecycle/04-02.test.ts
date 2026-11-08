import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import {
  resolveSettings,
  SettingsError,
  type FileSettings,
  type ServerSettings,
} from '../../../src/exercises/04-config-lifecycle/04-02.js';

const defaults: ServerSettings = { host: '127.0.0.1', port: 3000, logLevel: 'info' };

exerciseTest('04-02 resolveSettings uses defaults when file and env are empty', () => {
  assert.deepEqual(resolveSettings(defaults, undefined, {}), defaults);
});

exerciseTest('04-02 resolveSettings applies file then env precedence', () => {
  const file: FileSettings = { host: 'file-host', port: 4000, logLevel: 'debug' };
  const result = resolveSettings(defaults, file, {
    HOST: 'env-host',
    PORT: '5000',
  });

  assert.deepEqual(result, { host: 'env-host', port: 5000, logLevel: 'debug' });
});

exerciseTest('04-02 resolveSettings ignores undefined file fields', () => {
  const file = { port: undefined } as unknown as FileSettings;
  assert.deepEqual(resolveSettings(defaults, file, {}), defaults);
});

exerciseTest('04-02 resolveSettings validates overrides', () => {
  expectThrows(() => resolveSettings(defaults, undefined, { PORT: '0' }), SettingsError);
  expectThrows(() => resolveSettings(defaults, undefined, { PORT: '' }), /Invalid port/);
  expectThrows(() => resolveSettings(defaults, { host: '   ' }, {}), /Host must be non-empty/);
  expectThrows(
    () => resolveSettings(defaults, { logLevel: 'verbose' as 'info' }, {}),
    /Invalid log level/,
  );
});

exerciseTest('04-02 resolveSettings does not mutate inputs and freezes output', () => {
  const file: FileSettings = { host: 'file', port: 4000 };
  const snapshot = { ...file };

  const result = resolveSettings(defaults, file, {});
  assert.deepEqual(file, snapshot);
  assert.deepEqual(defaults, { host: '127.0.0.1', port: 3000, logLevel: 'info' });
  assert.equal(Object.isFrozen(result), true);
});

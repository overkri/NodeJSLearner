import assert from 'node:assert/strict';
import path from 'node:path';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows } from '../../helpers/assertions.js';
import { parseCliArgs, resolveInside } from '../../../src/exercises/00-runtime-language/00-03.js';

exerciseTest('00-03 parseCliArgs applies defaults', () => {
  assert.deepEqual(parseCliArgs([]), {
    configPath: './ledger.config.json',
    verbose: false,
  });
});

exerciseTest('00-03 parseCliArgs accepts separated and inline values', () => {
  assert.deepEqual(parseCliArgs(['--config', 'a.json', '--port=8080', '--verbose']), {
    configPath: 'a.json',
    port: 8080,
    verbose: true,
  });
  assert.deepEqual(parseCliArgs(['--config=b.json', '--port', '1']), {
    configPath: 'b.json',
    port: 1,
    verbose: false,
  });
});

exerciseTest('00-03 parseCliArgs rejects ambiguous input', () => {
  expectThrows(() => parseCliArgs(['--config']), /Missing value/);
  expectThrows(() => parseCliArgs(['--port']), /Missing value/);
  expectThrows(() => parseCliArgs(['--port', '0']), /out of range/);
  expectThrows(() => parseCliArgs(['--port', '65536']), /out of range/);
  expectThrows(() => parseCliArgs(['--port', '80.5']), /Invalid port/);
  expectThrows(() => parseCliArgs(['--verbose=yes']), /does not take a value/);
  expectThrows(() => parseCliArgs(['--config', 'a', '--config', 'b']), /Duplicate/);
  expectThrows(() => parseCliArgs(['positional']), /Unknown argument/);
});

exerciseTest('00-03 resolveInside keeps relative paths under root', () => {
  const root = path.resolve('sandbox-root');
  assert.equal(resolveInside(root, 'data/file.csv'), path.join(root, 'data/file.csv'));
  assert.equal(resolveInside(root, './data/../file.csv'), path.join(root, 'file.csv'));
});

exerciseTest('00-03 resolveInside blocks traversal and absolute paths', () => {
  const root = path.resolve('sandbox-root');
  expectThrows(() => resolveInside(root, '../secret.txt'), /escapes root/);
  expectThrows(() => resolveInside(root, 'nested/../../secret.txt'), /escapes root/);
  expectThrows(() => resolveInside(root, path.resolve('outside.txt')), /escapes root/);
  expectThrows(
    () => resolveInside(path.join(root, 'app'), path.join('..', 'app-evil', 'x')),
    /escapes root/,
  );
});

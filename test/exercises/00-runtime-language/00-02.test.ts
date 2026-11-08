import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectRejects } from '../../helpers/assertions.js';
import { readPackageMetadata } from '../../../src/exercises/00-runtime-language/00-02.js';

async function withPackageJson(
  content: unknown,
  fn: (filePath: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), 'nodejs-learner-pkg-'));
  try {
    const filePath = path.join(directory, 'package.json');
    await writeFile(filePath, JSON.stringify(content), 'utf8');
    await fn(filePath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

exerciseTest('00-02 reads module package metadata', async () => {
  await withPackageJson(
    {
      name: 'ledger-api',
      version: '1.2.3',
      type: 'module',
      engines: { node: '>=26' },
      dependencies: { zod: '4.6.7', pg: '8.23.1' },
    },
    async (filePath) => {
      const metadata = await readPackageMetadata(filePath);
      assert.deepEqual(metadata, {
        name: 'ledger-api',
        version: '1.2.3',
        moduleType: 'module',
        engines: { node: '>=26' },
        dependencyCount: 2,
      });
    },
  );
});

exerciseTest('00-02 defaults missing type, engines and dependencies', async () => {
  await withPackageJson({ name: 'commonjs-package', version: '0.0.1' }, async (filePath) => {
    const metadata = await readPackageMetadata(filePath);
    assert.equal(metadata.moduleType, 'commonjs');
    assert.deepEqual(metadata.engines, {});
    assert.equal(metadata.dependencyCount, 0);
  });
});

exerciseTest('00-02 rejects invalid runtime shapes', async () => {
  await withPackageJson(['not', 'an', 'object'], async (filePath) => {
    await expectRejects(readPackageMetadata(filePath));
  });
  await withPackageJson({ name: '', version: '1.0.0' }, async (filePath) => {
    await expectRejects(readPackageMetadata(filePath));
  });
  await withPackageJson({ name: 'bad-type', version: '1.0.0', type: 'esm' }, async (filePath) => {
    await expectRejects(readPackageMetadata(filePath));
  });
});

exerciseTest('00-02 surfaces malformed JSON and missing files', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'nodejs-learner-pkg-'));
  try {
    const filePath = path.join(directory, 'package.json');
    await writeFile(filePath, '{ nope', 'utf8');
    await expectRejects(readPackageMetadata(filePath), SyntaxError);
    await expectRejects(readPackageMetadata(path.join(directory, 'missing.json')));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

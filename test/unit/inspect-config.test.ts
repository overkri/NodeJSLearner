import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { inspectConfig } from '../../src/cli/inspect-config.js';

void test('inspectConfig validates config and hashes the data file', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'nodejs-learner-cli-'));
  try {
    await writeFile(
      path.join(directory, 'ledger.config.json'),
      JSON.stringify({ name: 'ledger', port: 3001, dataFile: './data/ledger.csv' }),
      'utf8',
    );
    await mkdir(path.join(directory, 'data'));
    await writeFile(path.join(directory, 'data', 'ledger.csv'), 'id,amount\n1,100\n', 'utf8');

    const report = await inspectConfig('./ledger.config.json', { cwd: directory });
    assert.equal(report.config.port, 3001);
    assert.equal(report.dataFile.sizeBytes, 16);
    assert.match(report.dataFile.sha256, /^[a-f0-9]{64}$/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

void test('inspectConfig rejects traversal outside the configured root', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'nodejs-learner-cli-'));
  try {
    await writeFile(
      path.join(directory, 'ledger.config.json'),
      JSON.stringify({ dataFile: '../outside.csv' }),
      'utf8',
    );
    await assert.rejects(inspectConfig('./ledger.config.json', { cwd: directory }));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

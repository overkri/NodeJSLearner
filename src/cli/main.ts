import { inspectConfig } from './inspect-config.js';

async function main(): Promise<void> {
  const configPath = process.argv[2] ?? './ledger.config.json';
  try {
    const report = await inspectConfig(configPath);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(
      `Config inspection failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}

await main();

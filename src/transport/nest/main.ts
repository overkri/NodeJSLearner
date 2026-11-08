import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NodeAdapter } from '@nestjs/platform-node';
import { LedgerService } from '../../application/ledger-service.js';
import { systemClock, uuidIds } from '../../shared/system.js';
import { LedgerNestModule } from './ledger-nest.js';

const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? '127.0.0.1';
const ledger = new LedgerService(systemClock, uuidIds);

const app = await NestFactory.create(LedgerNestModule.forRoot(ledger), new NodeAdapter(), {
  logger: false,
});
app.enableShutdownHooks();
await app.listen(port, host);
console.log(JSON.stringify({ event: 'nest.listen', host, port }));

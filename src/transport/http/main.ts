import { LedgerService } from '../../application/ledger-service.js';
import { closeHttpServer } from '../../infrastructure/lifecycle/http-shutdown.js';
import { systemClock, uuidIds } from '../../shared/system.js';
import { createLedgerHttpServer } from './ledger-server.js';

const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? '127.0.0.1';
const ledger = new LedgerService(systemClock, uuidIds);
const server = createLedgerHttpServer(ledger);

server.listen(port, host, () => {
  console.log(JSON.stringify({ event: 'http.listen', host, port }));
});

let stopping = false;
const shutdown = async (): Promise<void> => {
  if (stopping) {
    return;
  }
  stopping = true;
  await closeHttpServer(server, 10_000);
  console.log(JSON.stringify({ event: 'http.closed' }));
};

process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());

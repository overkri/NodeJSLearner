import { parentPort } from 'node:worker_threads';

const port = parentPort;
if (port === null) {
  throw new Error('01-03.worker.ts must run as a worker');
}

port.on('message', (values: unknown) => {
  if (!(values instanceof BigInt64Array)) {
    throw new TypeError('Worker expected a BigInt64Array');
  }

  let total = 0n;
  for (const value of values) {
    total += value;
  }
  port.postMessage(total);
  port.close();
});

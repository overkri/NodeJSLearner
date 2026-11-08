import { Worker } from 'node:worker_threads';

export function sumInWorker(values: readonly bigint[]): Promise<bigint> {
  return new Promise<bigint>((resolve, reject) => {
    const buffer = BigInt64Array.from(values);
    const worker = new Worker(new URL('./01-03.worker.ts', import.meta.url));
    let settled = false;

    const finish = (action: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      void worker.terminate().then(action, () => {
        action();
      });
    };

    worker.once('message', (message: unknown) => {
      finish(() => {
        if (typeof message === 'bigint') {
          resolve(message);
        } else {
          reject(new TypeError('Worker returned a non-bigint result'));
        }
      });
    });

    worker.once('error', (error: Error) => {
      finish(() => reject(error instanceof Error ? error : new Error(String(error))));
    });

    worker.once('exit', (code) => {
      if (!settled) {
        settled = true;
        reject(new Error(`Worker exited before returning a result (code ${code})`));
      }
    });

    worker.postMessage(buffer, [buffer.buffer]);
  });
}

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

export type TestRequestListener = (request: IncomingMessage, response: ServerResponse) => void;

export interface TestServer {
  readonly baseUrl: string;
  close(): Promise<void>;
}

export async function startTestServer(handler: TestRequestListener): Promise<TestServer> {
  const server = createServer(handler);

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(0, '127.0.0.1');
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    server.close();
    throw new Error('Test server did not get a TCP port');
  }

  let closePromise: Promise<void> | null = null;
  const close = (): Promise<void> => {
    if (closePromise !== null) {
      return closePromise;
    }
    closePromise = new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error === undefined) {
          resolve();
        } else {
          reject(error);
        }
      });
      server.closeAllConnections();
    });
    return closePromise;
  };

  return { baseUrl: `http://127.0.0.1:${address.port}`, close };
}

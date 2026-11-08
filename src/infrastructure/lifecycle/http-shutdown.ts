import type { Server } from 'node:http';

/**
 * Stops accepting new connections and waits for in-flight requests, bounded by a timeout.
 * Used by the application shutdown coordinator.
 */
export async function closeHttpServer(server: Server, timeoutMs = 10_000): Promise<void> {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new RangeError(`timeoutMs must be an integer >= 1: ${timeoutMs}`);
  }
  if (!server.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      server.closeAllConnections();
      resolve();
    }, timeoutMs);

    server.close((error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
    server.closeIdleConnections();
  });
}

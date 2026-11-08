import type { IncomingMessage, ServerResponse } from 'node:http';
import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 10-03
 * Topic: ephemeral HTTP test server with guaranteed cleanup
 * Java/Spring analogy: MockWebServer/random port + @AfterEach shutdown, but here close()
 * must also terminate keep-alive connections or the test runner hangs.
 * Requirements:
 * - startTestServer listens on 127.0.0.1:0 and returns baseUrl + close().
 * - close() is idempotent and terminates idle keep-alive connections.
 * - Listen errors reject; server address must be TCP (not a pipe).
 * Hints:
 * - Use `server.listen(0, '127.0.0.1')` and `server.address()`.
 * - `server.close(callback)` + `server.closeAllConnections()`.
 * Trap: hard-coded port; forgetting close/finally; open keep-alive sockets.
 * Run tests: npm run test:exercises -- --test-name-pattern="10-03"
 */

export type TestRequestListener = (request: IncomingMessage, response: ServerResponse) => void;

export interface TestServer {
  readonly baseUrl: string;
  close(): Promise<void>;
}

export async function startTestServer(handler: TestRequestListener): Promise<TestServer> {
  void handler;
  throw new NotImplementedError('startTestServer');
}

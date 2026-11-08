import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { NotImplementedError } from '../../shared/not-implemented.js';
import type { Router } from './03-01.js';
import type { Middleware } from './03-02.js';

/**
 * Exercise 03-04
 * Topic: raw node:http server, routing, middleware, error envelope, body limits
 * Java/Spring analogy: a tiny servlet container + DispatcherServlet, assembled explicitly.
 * There is no framework to catch handler errors or serialize exceptions for you.
 * Requirements:
 * - createHttpServer dispatches METHOD + path through Router and composeMiddleware.
 * - Unknown path -> 404; known path with wrong method -> 405 + Allow.
 * - Request id comes from x-request-id (safe format) or randomUUID; echoed in response.
 * - HttpError maps to its status/code; unknown errors -> 500 INTERNAL_ERROR without details.
 * - Body errors (PayloadTooLargeError/InvalidJsonError) map to 413/400.
 * - sendJson sets JSON content type, content-length and request id.
 * Hints:
 * - The http handler is not awaited by Node: catch all errors inside.
 * - Check res.headersSent before writing an error.
 * Trap: leaking error.message/stack to clients; writing twice after headers sent.
 * Run tests: npm run test:exercises -- --test-name-pattern="03-04"
 */

export interface HttpContext {
  readonly requestId: string;
  readonly params: Readonly<Record<string, string>>;
  readonly pathname: string;
  readonly url: URL;
  readonly state: Map<string, unknown>;
  readonly bodyLimitBytes: number;
  readonly signal: AbortSignal;
}

export type HttpHandler = (
  request: IncomingMessage,
  response: ServerResponse,
  context: HttpContext,
) => Promise<void> | void;

export type HttpMiddleware = Middleware<HttpContext>;

export interface HttpServerOptions {
  readonly middlewares?: readonly HttpMiddleware[];
  readonly bodyLimitBytes?: number;
}

export class HttpError extends Error {
  public override readonly name = 'HttpError';
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown;

  public constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface ErrorEnvelope {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly requestId: string;
    readonly details?: unknown;
  };
}

export function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  headers: Readonly<Record<string, string>> = {},
): void {
  void response;
  void statusCode;
  void body;
  void headers;
  throw new NotImplementedError('sendJson');
}

export function createHttpServer(
  router: Router<HttpHandler>,
  options: HttpServerOptions = {},
): Server {
  void router;
  void options;
  throw new NotImplementedError('createHttpServer');
}

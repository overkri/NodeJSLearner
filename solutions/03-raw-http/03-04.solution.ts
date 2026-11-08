import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Router } from '#src/exercises/03-raw-http/03-01.js';
import { composeMiddleware, type Middleware } from '#src/exercises/03-raw-http/03-02.js';

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

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function requestIdFrom(request: IncomingMessage): string {
  const raw = request.headers['x-request-id'];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return candidate !== undefined && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
}

export function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  headers: Readonly<Record<string, string>> = {},
): void {
  if (response.headersSent) {
    return;
  }

  const payload = Buffer.from(JSON.stringify(body), 'utf8');
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('content-length', payload.byteLength);
  for (const [name, value] of Object.entries(headers)) {
    response.setHeader(name, value);
  }
  response.end(payload);
}

function errorEnvelope(
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
): ErrorEnvelope {
  return details === undefined
    ? { error: { code, message, requestId } }
    : { error: { code, message, requestId, details } };
}

interface KnownHttpError {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

function asKnownHttpError(error: unknown): KnownHttpError | null {
  if (error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    };
  }
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    const statusCode = record['statusCode'];
    const code = record['code'];
    if (
      typeof statusCode === 'number' &&
      typeof code === 'string' &&
      typeof record['message'] === 'string'
    ) {
      return { statusCode, code, message: record['message'] };
    }
  }
  return null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function createHttpServer(
  router: Router<HttpHandler>,
  options: HttpServerOptions = {},
): Server {
  const middlewares: readonly HttpMiddleware[] = options.middlewares ?? [];
  const bodyLimitBytes = options.bodyLimitBytes ?? 1_048_576;
  if (!Number.isInteger(bodyLimitBytes) || bodyLimitBytes < 1) {
    throw new RangeError(`bodyLimitBytes must be an integer >= 1: ${bodyLimitBytes}`);
  }

  const dispatch = composeMiddleware<HttpContext>(middlewares);

  const handle = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const requestId = requestIdFrom(request);
    response.setHeader('x-request-id', requestId);

    let url: URL;
    try {
      url = new URL(request.url ?? '/', 'http://localhost');
    } catch {
      sendJson(response, 400, errorEnvelope('BAD_REQUEST', 'Invalid URL', requestId));
      return;
    }

    const method = (request.method ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    const match = router.match(method, url.pathname);

    if (match === null) {
      const allowed = router.allowedMethods(url.pathname);
      if (allowed.length > 0) {
        sendJson(
          response,
          405,
          errorEnvelope('METHOD_NOT_ALLOWED', 'Method not allowed', requestId),
          { allow: [...allowed].join(', ') },
        );
      } else {
        sendJson(response, 404, errorEnvelope('NOT_FOUND', 'Route not found', requestId));
      }
      return;
    }

    const controller = new AbortController();
    response.once('close', () => {
      if (!response.writableEnded) {
        controller.abort();
      }
    });

    const context: HttpContext = {
      requestId,
      params: match.params,
      pathname: url.pathname,
      url,
      state: new Map<string, unknown>(),
      bodyLimitBytes,
      signal: controller.signal,
    };

    try {
      await dispatch(context, async () => {
        await match.handler(request, response, context);
      });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      const known = asKnownHttpError(error);
      if (known !== null) {
        sendJson(
          response,
          known.statusCode,
          errorEnvelope(known.code, known.message, requestId, known.details),
        );
        if (known.statusCode === 413) {
          request.resume();
        }
        return;
      }

      sendJson(response, 500, errorEnvelope('INTERNAL_ERROR', 'Internal server error', requestId));
    }
  };

  return createServer((request, response) => {
    void handle(request, response).catch(() => {
      if (!response.headersSent) {
        sendJson(
          response,
          500,
          errorEnvelope('INTERNAL_ERROR', 'Internal server error', requestIdFrom(request)),
        );
      } else if (!response.writableEnded) {
        response.destroy();
      }
    });
  });
}

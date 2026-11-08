import 'reflect-metadata';
import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^@\s/]+@/gi, '$1[REDACTED]@')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(
      /(authorization|token|password|secret|api[_-]?key)(["']?\s*[:=]\s*["']?)(?!Bearer\b|\[REDACTED\])[^"'\s&,}]+/gi,
      '$1$2[REDACTED]',
    );
}

export interface ErrorEnvelopeBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly requestId: string;
  };
}

interface RequestLike {
  readonly headers: {
    readonly 'x-request-id'?: string | string[] | undefined;
  };
}

interface ResponseLike {
  readonly headersSent?: boolean;
  status(code: number): ResponseLike;
  json(body: unknown): ResponseLike;
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function requestIdFrom(request: RequestLike): string {
  const raw = request.headers['x-request-id'];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  return candidate !== undefined && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
}

const STATUS_CODES: Readonly<Record<number, string>> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
};

function fromHttpException(exception: HttpException): { code: string; message: string } {
  const status = exception.getStatus();
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return {
      code: STATUS_CODES[status] ?? 'HTTP_ERROR',
      message: sanitizeErrorMessage(response),
    };
  }
  if (typeof response === 'object' && response !== null) {
    const record = response as Record<string, unknown>;
    const rawMessage = record['message'];
    const message = Array.isArray(rawMessage)
      ? rawMessage.map(String).join('; ')
      : typeof rawMessage === 'string'
        ? rawMessage
        : exception.message;
    const code =
      typeof record['code'] === 'string' ? record['code'] : (STATUS_CODES[status] ?? 'HTTP_ERROR');
    return { code, message: sanitizeErrorMessage(message) };
  }
  return {
    code: STATUS_CODES[status] ?? 'HTTP_ERROR',
    message: sanitizeErrorMessage(exception.message),
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestLike>();
    const response = http.getResponse<ResponseLike>();
    const requestId = requestIdFrom(request);

    if (response.headersSent === true) {
      return;
    }

    if (exception instanceof HttpException) {
      const mapped = fromHttpException(exception);
      response.status(exception.getStatus()).json({
        error: { code: mapped.code, message: mapped.message, requestId },
      });
      return;
    }

    response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId,
      },
    });
  }
}

export { HttpException };

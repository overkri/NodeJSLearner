import 'reflect-metadata';
import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 11-06
 * Topic: Nest exception filter with one error envelope
 * Java/Spring analogy: @ControllerAdvice/@ExceptionHandler, but the filter writes the
 * response itself and must not leak internal errors or double-send headers.
 * Requirements:
 * - HttpException -> its status and code/message from the response object.
 * - Unknown errors -> 500 INTERNAL_ERROR, generic message.
 * - requestId from safe x-request-id or randomUUID.
 * - If headers were already sent, do not write again.
 * Hints:
 * - `host.switchToHttp().getResponse()` is NodeResponse with status().json().
 * - Validation pipe messages may be an array; join them.
 * Trap: returning exception.stack; calling json after headersSent.
 * Run tests: npm run test:exercises -- --test-name-pattern="11-06"
 */

export interface ErrorEnvelopeBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly requestId: string;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  public catch(_exception: unknown, _host: ArgumentsHost): void {
    void _exception;
    void _host;
    throw new NotImplementedError('HttpExceptionFilter.catch');
  }
}

export { HttpException, HttpStatus };

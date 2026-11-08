import type { Readable } from 'node:stream';

export class PayloadTooLargeError extends Error {
  public override readonly name = 'PayloadTooLargeError';
  public readonly code = 'PAYLOAD_TOO_LARGE';
  public readonly statusCode = 413;

  public constructor(maxBytes: number) {
    super(`Request body exceeds ${maxBytes} bytes`);
  }
}

export class InvalidJsonError extends Error {
  public override readonly name = 'InvalidJsonError';
  public readonly code = 'INVALID_JSON';
  public readonly statusCode = 400;

  public constructor() {
    super('Request body is not valid JSON');
  }
}

export interface ReadJsonOptions {
  readonly maxBytes?: number;
  readonly signal?: AbortSignal;
}

function abortError(): DOMException {
  return new DOMException('Request body read aborted', 'AbortError');
}

export async function readJsonBody(
  stream: Readable,
  options: ReadJsonOptions = {},
): Promise<unknown> {
  const maxBytes = options.maxBytes ?? 1_048_576;
  if (!Number.isInteger(maxBytes) || maxBytes < 1) {
    throw new RangeError(`maxBytes must be an integer >= 1: ${maxBytes}`);
  }

  const signal = options.signal;
  if (signal?.aborted === true) {
    throw abortError();
  }
  if (stream.readableEnded) {
    return undefined;
  }

  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    let totalBytes = 0;
    let settled = false;

    const cleanup = (): void => {
      stream.off('data', onData);
      stream.off('end', onEnd);
      stream.off('error', onError);
      signal?.removeEventListener('abort', onAbort);
    };

    const finish = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };

    const fail = (error: Error): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      stream.pause();
      reject(error);
    };

    const onData = (chunk: Buffer | string): void => {
      if (settled) {
        return;
      }
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.byteLength;
      if (totalBytes > maxBytes) {
        fail(new PayloadTooLargeError(maxBytes));
        return;
      }
      chunks.push(buffer);
    };
    const onEnd = (): void => finish();
    const onError = (error: Error): void => fail(error);
    const onAbort = (): void => fail(abortError());

    stream.on('data', onData);
    stream.once('end', onEnd);
    stream.once('error', onError);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

  if (chunks.length === 0) {
    return undefined;
  }

  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new InvalidJsonError();
  }
}

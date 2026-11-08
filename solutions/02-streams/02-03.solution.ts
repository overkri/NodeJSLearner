import type { Writable } from 'node:stream';

export interface WriteOptions {
  readonly signal?: AbortSignal;
}

function abortError(): DOMException {
  return new DOMException('Operation aborted', 'AbortError');
}

function waitForDrain(destination: Writable, signal: AbortSignal | undefined): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const cleanup = (): void => {
      destination.off('drain', onDrain);
      destination.off('error', onError);
      destination.off('close', onClose);
    };
    const onDrain = (): void => {
      cleanup();
      resolve();
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const onClose = (): void => {
      cleanup();
      reject(
        signal?.aborted === true ? abortError() : new Error('Destination closed before drain'),
      );
    };

    destination.once('drain', onDrain);
    destination.once('error', onError);
    destination.once('close', onClose);
  });
}

export async function writeAll(
  destination: Writable,
  chunks: AsyncIterable<Uint8Array>,
  options: WriteOptions = {},
): Promise<number> {
  const signal = options.signal;
  if (signal?.aborted === true) {
    throw abortError();
  }

  let streamError: Error | undefined;
  const onError = (error: Error): void => {
    streamError = error;
  };
  const throwStreamError = (): void => {
    if (streamError !== undefined) {
      throw streamError;
    }
  };
  const onAbort = (): void => {
    destination.destroy();
  };

  destination.on('error', onError);
  signal?.addEventListener('abort', onAbort, { once: true });

  let written = 0;
  try {
    for await (const chunk of chunks) {
      if (signal?.aborted) {
        throw abortError();
      }
      throwStreamError();

      const buffer = Buffer.from(chunk);
      const accepted = destination.write(buffer);
      written += buffer.byteLength;

      if (!accepted) {
        await waitForDrain(destination, signal);
      }
      throwStreamError();
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    destination.off('error', onError);
  }

  return written;
}

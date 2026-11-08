import { StringDecoder } from 'node:string_decoder';

export interface ReadLinesOptions {
  readonly maxLineLength?: number;
  readonly signal?: AbortSignal;
}

export class LineTooLongError extends Error {
  public override readonly name = 'LineTooLongError';
  public readonly code = 'LINE_TOO_LONG';

  public constructor(maxLineLength: number) {
    super(`Line exceeds ${maxLineLength} characters`);
  }
}

export async function* readLines(
  stream: AsyncIterable<Uint8Array>,
  options: ReadLinesOptions = {},
): AsyncGenerator<string> {
  const maxLineLength = options.maxLineLength ?? 65_536;
  if (!Number.isInteger(maxLineLength) || maxLineLength < 1) {
    throw new RangeError(`maxLineLength must be an integer >= 1: ${maxLineLength}`);
  }

  const decoder = new StringDecoder('utf8');
  let carry = '';

  for await (const chunk of stream) {
    if (options.signal?.aborted === true) {
      throw new DOMException('Operation aborted', 'AbortError');
    }

    carry += decoder.write(Buffer.from(chunk));
    if (carry.length > maxLineLength && !carry.includes('\n')) {
      throw new LineTooLongError(maxLineLength);
    }

    let newlineIndex = carry.indexOf('\n');
    while (newlineIndex !== -1) {
      let line = carry.slice(0, newlineIndex);
      carry = carry.slice(newlineIndex + 1);
      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }
      if (line.length > maxLineLength) {
        throw new LineTooLongError(maxLineLength);
      }
      yield line;
      newlineIndex = carry.indexOf('\n');
    }
    if (carry.length > maxLineLength) {
      throw new LineTooLongError(maxLineLength);
    }
  }

  carry += decoder.end();
  if (carry.length > 0) {
    const line = carry.endsWith('\r') ? carry.slice(0, -1) : carry;
    if (line.length > maxLineLength) {
      throw new LineTooLongError(maxLineLength);
    }
    yield line;
  }
}

import { createHash } from 'node:crypto';

export function readAsciiPrefix(input: Buffer, length: number): string {
  if (!Number.isInteger(length) || length < 0 || length > input.length) {
    throw new RangeError(`Invalid prefix length: ${length}`);
  }
  const prefix = input.subarray(0, length);
  for (const byte of prefix) {
    if (byte > 0x7f) {
      throw new Error(`Non-ASCII byte in prefix: 0x${byte.toString(16)}`);
    }
  }
  return prefix.toString('ascii');
}

export function concatChunks(chunks: readonly Uint8Array[]): Buffer {
  return Buffer.concat(chunks);
}

export function splitOn(input: Buffer, delimiter: Buffer): Buffer[] {
  if (delimiter.length === 0) {
    throw new Error('Delimiter must not be empty');
  }

  const parts: Buffer[] = [];
  let start = 0;
  while (start <= input.length) {
    const found = input.indexOf(delimiter, start);
    if (found === -1) {
      parts.push(Buffer.from(input.subarray(start)));
      break;
    }
    parts.push(Buffer.from(input.subarray(start, found)));
    start = found + delimiter.length;
  }
  return parts;
}

export function decodeUtf8Strict(input: Buffer): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(input);
}

export function sha256Hex(input: Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

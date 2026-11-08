import { Transform } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';

export interface CsvRow {
  readonly name: string;
  readonly amountMinor: bigint;
}

export class CsvFormatError extends Error {
  public override readonly name = 'CsvFormatError';
  public readonly code = 'CSV_FORMAT_ERROR';

  public constructor(lineNumber: number, message: string) {
    super(`CSV line ${lineNumber}: ${message}`);
  }
}

const HEADER = 'name,amount';

class CsvTransform extends Transform {
  private readonly decoder = new StringDecoder('utf8');
  private carry = '';
  private lineNumber = 0;
  private headerSeen = false;

  public constructor() {
    super({ readableObjectMode: true });
  }

  public override _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    try {
      this.carry += this.decoder.write(chunk);
      this.consumeLines(false);
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  public override _flush(callback: (error?: Error | null) => void): void {
    try {
      this.carry += this.decoder.end();
      this.consumeLines(true);
      if (!this.headerSeen) {
        throw new CsvFormatError(1, 'missing header');
      }
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private consumeLines(final: boolean): void {
    let newlineIndex = this.carry.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = this.carry.slice(0, newlineIndex);
      this.carry = this.carry.slice(newlineIndex + 1);
      this.consumeLine(line);
      newlineIndex = this.carry.indexOf('\n');
    }

    if (final && this.carry.length > 0) {
      const line = this.carry;
      this.carry = '';
      this.consumeLine(line);
    }
  }

  private consumeLine(rawLine: string): void {
    this.lineNumber += 1;
    const normalized = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    const line = this.lineNumber === 1 ? normalized.replace(/^\uFEFF/, '') : normalized;

    if (line.trim() === '') {
      return;
    }

    if (!this.headerSeen) {
      if (line !== HEADER) {
        throw new CsvFormatError(this.lineNumber, `expected header ${HEADER}`);
      }
      this.headerSeen = true;
      return;
    }

    const columns = line.split(',');
    if (columns.length !== 2) {
      throw new CsvFormatError(this.lineNumber, 'expected exactly 2 columns');
    }
    const name = columns[0]?.trim() ?? '';
    const amount = columns[1]?.trim() ?? '';
    if (name === '') {
      throw new CsvFormatError(this.lineNumber, 'name is empty');
    }
    if (!/^\d+$/.test(amount)) {
      throw new CsvFormatError(this.lineNumber, 'amount must be a non-negative integer');
    }
    this.push({ name, amountMinor: BigInt(amount) } satisfies CsvRow);
  }
}

export function createCsvTransform(): Transform {
  return new CsvTransform();
}

export interface QueryResultLike {
  readonly rows: readonly unknown[];
}

export interface TransactionClient {
  query(sql: string, params?: readonly unknown[]): Promise<QueryResultLike>;
  release(error?: Error | boolean): void;
}

export interface TransactionPool {
  connect(): Promise<TransactionClient>;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export async function runInTransaction<TResult>(
  pool: TransactionPool,
  work: (client: TransactionClient) => Promise<TResult>,
): Promise<TResult> {
  const client = await pool.connect();
  let started = false;
  let failure: Error | undefined;
  let releaseFailure: unknown;
  let result!: TResult;

  try {
    await client.query('BEGIN');
    started = true;
    result = await work(client);
    await client.query('COMMIT');
  } catch (error) {
    failure = toError(error);
    if (started) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // The primary error is the operation/commit failure.
      }
    }
    throw failure;
  } finally {
    try {
      client.release(failure);
    } catch (error) {
      releaseFailure = error;
    }
  }

  if (releaseFailure !== undefined) {
    throw toError(releaseFailure);
  }
  return result;
}

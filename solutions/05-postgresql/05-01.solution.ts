export interface PoolClientLike {
  release(error?: Error | boolean): void;
}

export interface PoolLike<TClient extends PoolClientLike> {
  connect(): Promise<TClient>;
}

export async function withClient<TClient extends PoolClientLike, TResult>(
  pool: PoolLike<TClient>,
  operation: (client: TClient) => Promise<TResult>,
): Promise<TResult> {
  const client = await pool.connect();
  let succeeded = false;

  try {
    const result = await operation(client);
    succeeded = true;
    return result;
  } finally {
    if (succeeded) {
      client.release();
    } else {
      try {
        client.release(new Error('Operation failed'));
      } catch {
        // The operation error is the primary failure; do not mask it with release noise.
      }
    }
  }
}

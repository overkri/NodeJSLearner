import { Pool, type PoolClient, type PoolConfig } from 'pg';

export interface Transaction {
  readonly client: PoolClient;
}

export function createPool(
  connectionString: string,
  config: Omit<PoolConfig, 'connectionString'> = {},
): Pool {
  const pool = new Pool({
    connectionString,
    max: config.max ?? 10,
    idleTimeoutMillis: config.idleTimeoutMillis ?? 30_000,
    connectionTimeoutMillis: config.connectionTimeoutMillis ?? 5_000,
    ...config,
  });
  pool.on('error', () => {
    // Idle client failures are surfaced on checkout; avoid an unhandled 'error' event.
  });
  return pool;
}

export async function withPoolClient<TResult>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<TResult>,
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
      client.release(new Error('Database operation failed'));
    }
  }
}

export async function withTransaction<TResult>(
  pool: Pool,
  work: (transaction: Transaction) => Promise<TResult>,
): Promise<TResult> {
  return await withPoolClient(pool, async (client) => {
    let begun = false;

    try {
      await client.query('BEGIN');
      begun = true;
      const result = await work({ client });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      if (begun) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // Preserve the primary failure.
        }
      }
      throw error;
    }
  });
}

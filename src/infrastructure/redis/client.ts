import { createClient } from 'redis';

/**
 * Owns one node-redis connection. The caller is responsible for close() during shutdown.
 */
export async function connectRedis(url: string, onError: (error: Error) => void = () => undefined) {
  const client = createClient({ url });
  client.on('error', onError);
  await client.connect();
  return client;
}

export type RedisClient = Awaited<ReturnType<typeof connectRedis>>;

export async function closeRedis(client: RedisClient): Promise<void> {
  if (client.isOpen) {
    await client.quit();
  }
}

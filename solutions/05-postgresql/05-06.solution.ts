export interface EntryRecord {
  readonly accountId: string;
  readonly id: string;
  readonly amountMinor: bigint;
  readonly createdAt: Date;
}

export type BatchFetcher = (accountIds: readonly string[]) => Promise<readonly EntryRecord[]>;

export interface BatchOptions {
  readonly batchSize?: number;
}

export async function loadEntriesByAccount(
  accountIds: readonly string[],
  fetchBatch: BatchFetcher,
  options: BatchOptions = {},
): Promise<ReadonlyMap<string, readonly EntryRecord[]>> {
  const batchSize = options.batchSize ?? 100;
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError(`batchSize must be an integer >= 1: ${batchSize}`);
  }

  const uniqueIds = [...new Set(accountIds)];
  const grouped = new Map<string, EntryRecord[]>();
  for (const id of uniqueIds) {
    grouped.set(id, []);
  }
  if (uniqueIds.length === 0) {
    return grouped;
  }

  for (let offset = 0; offset < uniqueIds.length; offset += batchSize) {
    const chunk = uniqueIds.slice(offset, offset + batchSize);
    const rows = await fetchBatch(chunk);
    for (const row of rows) {
      grouped.get(row.accountId)?.push(row);
    }
  }

  return grouped;
}

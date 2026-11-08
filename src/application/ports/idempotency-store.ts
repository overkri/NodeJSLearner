export interface IdempotencyStore {
  execute<T>(key: string, requestHash: string, operation: () => Promise<T>): Promise<T>;
}

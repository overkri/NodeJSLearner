export interface ConsumableEvent {
  readonly eventId: string;
}

export interface ProcessedEventStore {
  has(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
}

export type ConsumeOutcome = 'processed' | 'duplicate';

export async function handleEventOnce<TResult>(
  store: ProcessedEventStore,
  event: ConsumableEvent,
  handler: (event: ConsumableEvent) => Promise<TResult>,
): Promise<ConsumeOutcome> {
  if (event.eventId.trim() === '') {
    throw new Error('eventId must be non-empty');
  }

  if (await store.has(event.eventId)) {
    return 'duplicate';
  }

  await handler(event);
  await store.markProcessed(event.eventId);
  return 'processed';
}

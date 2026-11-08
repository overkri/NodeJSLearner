import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  readonly requestId: string;
  readonly route: string;
  readonly principalId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

function validate(context: RequestContext): RequestContext {
  if (context.requestId.trim() === '') {
    throw new Error('Request id must be non-empty');
  }
  if (!context.route.startsWith('/')) {
    throw new Error('Route must start with /');
  }
  return Object.freeze({ ...context });
}

export function runWithRequestContext<TResult>(
  context: RequestContext,
  callback: () => Promise<TResult>,
): Promise<TResult> {
  return storage.run(validate(context), callback);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function requireRequestContext(): RequestContext {
  const context = storage.getStore();
  if (context === undefined) {
    throw new Error('Request context is not available');
  }
  return context;
}

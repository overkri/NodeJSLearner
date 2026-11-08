export type Next = () => Promise<void>;
export type Middleware<TContext> = (context: TContext, next: Next) => Promise<void> | void;

export function composeMiddleware<TContext>(
  middlewares: readonly Middleware<TContext>[],
): (context: TContext, terminal?: Next) => Promise<void> {
  return async (context: TContext, terminal: Next = async () => undefined) => {
    let lastIndex = -1;

    const dispatch = async (index: number): Promise<void> => {
      if (index <= lastIndex) {
        throw new Error('next() called multiple times');
      }
      lastIndex = index;

      const middleware = middlewares[index];
      if (middleware === undefined) {
        await terminal();
        return;
      }

      await middleware(context, () => dispatch(index + 1));
    };

    await dispatch(0);
  };
}

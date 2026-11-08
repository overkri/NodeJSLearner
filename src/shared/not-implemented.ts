export class NotImplementedError extends Error {
  public override readonly name = 'NotImplementedError';

  public constructor(detail: string) {
    super(`TODO: ${detail}`);
  }
}

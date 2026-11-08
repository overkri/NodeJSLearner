export type Principal = {
  readonly subject: string;
  readonly scopes: readonly string[];
};

export interface TokenVerifier {
  verify(token: string): Promise<Principal>;
}

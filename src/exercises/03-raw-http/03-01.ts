import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 03-01
 * Topic: HTTP routing without a framework
 * Java/Spring analogy: a minimal RequestMappingHandlerMapping, but path matching is
 * explicit code and there is no servlet container to normalize URLs for you.
 * Requirements:
 * - Register METHOD + path patterns such as /accounts/:id/entries.
 * - match() returns handler + decoded params, or null; registration order wins.
 * - allowedMethods() lists methods whose pattern matches the path.
 * - Reject malformed patterns, duplicate routes and non-absolute paths.
 * Hints:
 * - Split on '/', strip one trailing slash, ignore the leading empty segment.
 * - decodeURIComponent each parameter; malformed escapes make the route not match.
 * Trap: comparing raw URL strings breaks trailing slashes, encoded ids and params.
 * Run tests: npm run test:exercises -- --test-name-pattern="03-01"
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteMatch<THandler> {
  readonly handler: THandler;
  readonly params: Readonly<Record<string, string>>;
  readonly pattern: string;
}

interface Route<THandler> {
  readonly method: HttpMethod;
  readonly pattern: string;
  readonly segments: readonly string[];
  readonly handler: THandler;
}

function splitPath(pathname: string): string[] {
  const withoutTrailingSlash =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return withoutTrailingSlash.split('/').filter((segment, index) => index > 0 || segment !== '');
}

export class Router<THandler = unknown> {
  private readonly routes: Route<THandler>[] = [];

  public add(method: HttpMethod, pattern: string, handler: THandler): this {
    void handler;
    void method;
    void pattern;
    throw new NotImplementedError('Router.add');
  }

  public match(method: HttpMethod, pathname: string): RouteMatch<THandler> | null {
    void method;
    void pathname;
    throw new NotImplementedError('Router.match');
  }

  public allowedMethods(pathname: string): readonly HttpMethod[] {
    void pathname;
    throw new NotImplementedError('Router.allowedMethods');
  }
}

export function splitPathSegments(pathname: string): readonly string[] {
  return splitPath(pathname);
}

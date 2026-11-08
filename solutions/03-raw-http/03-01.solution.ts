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

function decodeSegments(segments: readonly string[]): string[] | null {
  try {
    return segments.map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
}

export class Router<THandler = unknown> {
  private readonly routes: Route<THandler>[] = [];

  public add(method: HttpMethod, pattern: string, handler: THandler): this {
    if (!pattern.startsWith('/')) {
      throw new Error(`Route pattern must start with '/': ${pattern}`);
    }
    if (method !== method.toUpperCase()) {
      throw new Error(`HTTP method must be uppercase: ${method}`);
    }

    const segments = splitPath(pattern);
    const paramNames = new Set<string>();
    for (const segment of segments) {
      if (segment.startsWith(':')) {
        const name = segment.slice(1);
        if (name === '') {
          throw new Error(`Empty route parameter in: ${pattern}`);
        }
        if (paramNames.has(name)) {
          throw new Error(`Duplicate route parameter '${name}' in: ${pattern}`);
        }
        paramNames.add(name);
      }
    }

    const normalizedPattern = `/${segments.join('/')}`;
    const shape = segments.map((segment) => (segment.startsWith(':') ? ':' : segment)).join('/');
    const duplicate = this.routes.some(
      (route) =>
        route.method === method &&
        route.segments.map((segment) => (segment.startsWith(':') ? ':' : segment)).join('/') ===
          shape,
    );
    if (duplicate) {
      throw new Error(`Duplicate route: ${method} ${normalizedPattern}`);
    }

    this.routes.push({ method, pattern: normalizedPattern, segments, handler });
    return this;
  }

  public match(method: HttpMethod, pathname: string): RouteMatch<THandler> | null {
    const pathSegments = decodeSegments(splitPath(pathname));
    if (pathSegments === null) {
      return null;
    }

    for (const route of this.routes) {
      if (route.method !== method || route.segments.length !== pathSegments.length) {
        continue;
      }

      const params: Record<string, string> = {};
      let matched = true;
      for (let index = 0; index < route.segments.length; index += 1) {
        const routeSegment = route.segments[index] as string;
        const pathSegment = pathSegments[index] as string;
        if (routeSegment.startsWith(':')) {
          if (pathSegment === '') {
            matched = false;
            break;
          }
          params[routeSegment.slice(1)] = pathSegment;
        } else if (routeSegment !== pathSegment) {
          matched = false;
          break;
        }
      }

      if (matched) {
        return { handler: route.handler, params, pattern: route.pattern };
      }
    }

    return null;
  }

  public allowedMethods(pathname: string): readonly HttpMethod[] {
    const pathSegments = decodeSegments(splitPath(pathname));
    if (pathSegments === null) {
      return [];
    }

    const methods = new Set<HttpMethod>();
    for (const route of this.routes) {
      if (route.segments.length !== pathSegments.length) {
        continue;
      }
      const matched = route.segments.every((segment, index) => {
        const pathSegment = pathSegments[index] as string;
        return segment.startsWith(':') ? pathSegment !== '' : segment === pathSegment;
      });
      if (matched) {
        methods.add(route.method);
      }
    }
    return [...methods].sort();
  }
}

export function splitPathSegments(pathname: string): readonly string[] {
  return splitPath(pathname);
}

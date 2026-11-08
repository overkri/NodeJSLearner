export interface ResponseHeaders {
  setHeader(name: string, value: string): void;
  removeHeader(name: string): void;
}

export interface SecurityHeadersOptions {
  readonly hsts?: boolean;
}

export const CONTENT_SECURITY_POLICY =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

const STATIC_HEADERS: Readonly<Record<string, string>> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'content-security-policy': CONTENT_SECURITY_POLICY,
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'cache-control': 'no-store',
};

export function applySecurityHeaders(
  headers: ResponseHeaders,
  options: SecurityHeadersOptions = {},
): void {
  headers.removeHeader('x-powered-by');
  headers.removeHeader('server');

  for (const [name, value] of Object.entries(STATIC_HEADERS)) {
    headers.setHeader(name, value);
  }

  if (options.hsts === true) {
    headers.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
  }
}

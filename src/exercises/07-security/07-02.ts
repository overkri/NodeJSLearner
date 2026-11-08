import { NotImplementedError } from '../../shared/not-implemented.js';

/**
 * Exercise 07-02
 * Topic: security headers for a JSON API
 * Java/Spring analogy: Spring Security headers, but here they are explicit middleware
 * choices; HSTS must only be sent over HTTPS, and CSP must not break API clients.
 * Requirements:
 * - applySecurityHeaders sets nosniff, DENY framing, no-referrer, a restrictive CSP,
 *   permissions policy and cross-origin isolation headers.
 * - Remove x-powered-by and server.
 * - Send HSTS only when options.hsts is true.
 * - The function is idempotent (same headers on repeated calls).
 * Hints:
 * - JSON APIs do not need scripts/styles; `default-src 'none'` is a good baseline.
 * - `frame-ancestors 'none'` is the modern replacement for X-Frame-Options, keep both.
 * Trap: sending HSTS in local HTTP development; leaving x-powered-by.
 * Run tests: npm run test:exercises -- --test-name-pattern="07-02"
 */

export interface ResponseHeaders {
  setHeader(name: string, value: string): void;
  removeHeader(name: string): void;
}

export interface SecurityHeadersOptions {
  readonly hsts?: boolean;
}

export const CONTENT_SECURITY_POLICY =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

export function applySecurityHeaders(
  headers: ResponseHeaders,
  options: SecurityHeadersOptions = {},
): void {
  void headers;
  void options;
  throw new NotImplementedError('applySecurityHeaders');
}

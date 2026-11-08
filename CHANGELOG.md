# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).
See [`README.md`](README.md) for the project's versioning policy.

## [Unreleased]

### Added

- MIT license in `LICENSE` and the `license` field in `package.json`.

## [1.0.0] - 2026-11-08

Initial release of the NodeJSLearner course and the Ledger API teaching project.

### Added

- 12 self-contained modules with theory, exercises, checklists, quizzes, and cheat sheets:
  runtime/language, async runtime, streams, raw HTTP, config/lifecycle, PostgreSQL, Redis,
  security, observability, Kafka/outbox, testing/hardening, and NestJS refactor.
- 59 exercises, each with a starter, contract tests, and a reference solution under
  `solutions/`.
- 267 local tests; `verify:solutions` swaps all reference solutions in, runs the suite in
  strict mode, and restores every starter file.
- End-to-end Ledger API scenario: customers, accounts, transfers, ledger entries, idempotent
  replay/conflict, and outbox events.
- Domain and application layer for money, accounts, transfers, errors, clocks, generators,
  repositories, idempotency, and event ports.
- Runnable raw HTTP API on `node:http` and the same API on NestJS 12 with
  `@nestjs/platform-node` (NodeAdapter).
- PostgreSQL schema and hand-written SQL migrations, including constraints, indexes, and a
  partial unpublished-outbox index.
- Redis helpers for atomic locks, idempotency caching, lock coordination, and rate limiting.
- Security exercises for Zod validation, security headers, JWT verification with `jose`,
  authorization policy, and Bearer-token extraction.
- Observability exercises for Pino logging with redaction, AsyncLocalStorage request context,
  Prometheus metrics, health checks, and low-cardinality route labels.
- KafkaJS producer/consumer and outbox exercises for event envelopes, retries, idempotent
  consumption, offset commits, and outbox polling.
- Testing helpers and exercises for `waitFor`, deterministic clocks/ids, test HTTP servers,
  deferreds/barriers, fault injection, and env-gated integration tests.
- Env-gated integration tests for PostgreSQL, Redis, Kafka, and HTTP shutdown.
- Documentation: `plan.md`, `README.md`, `docs/STACK.md`, `docs/API.md`,
  `docs/JAVA-SPRING-MAP.md`, `docs/BRIDGE-TO-NEXT.md`, `docs/AUTHORING.md`, and ADR 0001
  on money and transaction boundaries.
- ESLint flat config, Prettier, strict TypeScript/NodeNext configuration, and pinned
  dependencies with `package-lock.json`.

### Security

- Money is represented as integer minor units (`bigint` / PostgreSQL `bigint`) and decimal
  strings in JSON; floating-point money is prohibited.
- External inputs are validated with Zod at HTTP, env, Kafka, and CLI boundaries.
- JWTs are verified with `jose`; authorization is implemented as a separate policy step.
- Logs redact authorization headers, tokens, passwords, and secrets; metrics use only
  low-cardinality labels.

### Notes

- This is a learning project, not a production payment system.
- The runnable `dev:http` and `dev:nest` APIs use the in-memory `LedgerService`. PostgreSQL,
  Redis, Kafka, JWT, metrics, and rate limiting are exercised through exercises and
  integration tests rather than wired into the demo contour.
- `docs/API.md` describes the target course contract; it is broader than the current demo
  surface (`/health`, `/customers`, `/accounts`, `/transfers`).
- External services for integration tests are expected to be running already; the course
  intentionally does not provide Docker/Compose/Kubernetes or CI configuration.

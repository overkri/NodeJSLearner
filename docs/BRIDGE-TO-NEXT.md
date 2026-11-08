# BRIDGE-TO-NEXT

Курс заканчивается на рабочем Ledger API с raw Node и NestJS. Дальше имеет смысл углублять
не «ещё один CRUD», а эксплуатационные и распределённые аспекты.

## Identity и API contracts

- Keycloak/OIDC: discovery, JWKS rotation, audience/issuer validation, scopes/roles.
- OpenAPI 3.1 из Zod-схем; contract tests; версионирование.
- Идемпотентность на уровне API gateway и клиентов.

## Observability

- OpenTelemetry: traces через HTTP, PG, Redis, Kafka; propagation.
- RED/USE-метрики, SLO, алерты, histogram buckets.
- Correlation id и structured logging в production-сборщике.

## Resilience

- Таймауты и retry budget для внешних вызовов; circuit breaker.
- Backpressure на consumer; DLQ и replay.
- Graceful degradation при недоступности Redis.

## PostgreSQL

- EXPLAIN/ANALYZE, индексы под конкретные запросы, bloat/vacuum.
- Уровни изоляции, deadlock-анализ, advisory locks.
- Partitioning ledger_entries и архивирование.
- Drizzle migrations в командном процессе (expand/contract).

## Kafka

- Schema evolution (Avro/Protobuf), compatibility policy.
- Exactly-once semantics и transactional outbox на практике.
- Consumer groups, rebalancing, lag monitoring.
- Retention/compaction для event log.

## Performance и deployment

- Профилирование event loop (`--prof`, clinic), heap snapshots.
- worker_threads для CPU-bound задач; piscina при необходимости.
- Адаптация к платформе: graceful shutdown, probes, resource limits.
- CI/CD, Docker/K8s — отдельный трек, в этом курсе намеренно отсутствует.

## Инженерные практики

- Mutation testing, property-based tests для денег и идемпотентности.
- Fault injection и chaos-эксперименты.
- Threat modeling, secret management, supply-chain (SBOM, provenance).

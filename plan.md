# ТЗ: Node.js для бэкенд-разработки

Версия ТЗ: 1.0, дата фиксации: 2026-11-08. Это спецификация для кодинг-агента, не исходный код курса.

## 1. Допущения и обоснование выбора

### Среда и стек
- **Node.js 26 Active LTS**, не экспериментальная Node 27; зафиксировать major в `.nvmrc`, точные версии — lock-файлом. На дату ТЗ Node 26 перешёл в Active LTS 2026-10-28 ([release schedule](https://nodejs.org/en/about/previous-releases)).
- TypeScript `strict`, ESM, `NodeNext`, npm и `package-lock.json`. Исходники `.ts`, в ESM imports использовать `.js` extensions для NodeNext output.
- Сначала встроенный `node:http`, затем **NestJS 12 с `@nestjs/platform-node` (NodeAdapter)**: пользователь увидит низкоуровневый HTTP lifecycle до DI/decorators/pipes/guards. Nest — Spring-подобный opinionated слой без дополнительного Express/Fastify.
- Валидация: **Zod** + Nest `StandardSchemaValidationPipe`; runtime-схема одновременно задаёт TS type. Не использовать class-validator.
- PostgreSQL: **`pg` (node-postgres) + Drizzle ORM + drizzle-kit**. Сначала `pg`/SQL/pool/transaction, затем тонкий typed query layer. Не использовать Prisma: важно не скрывать SQL и транзакционные границы.
- Redis: **`redis` (node-redis)**; Kafka: **KafkaJS**, изолированный портами `EventPublisher`/`EventConsumer`; тесты: встроенные **`node:test` + `node:assert/strict`**, `supertest` только для HTTP; логирование **Pino**; метрики **prom-client**; JWT **jose**; security headers — Helmet-совместимые практики, интегрированные в NodeAdapter.
- ESLint flat config + Prettier. Последние стабильные совместимые версии на момент генерации, закреплённые `package-lock.json`; не использовать `latest` в CI. Nest docs: https://docs.nestjs.com/ ; Drizzle: https://orm.drizzle.team/docs/get-started-postgresql ; KafkaJS: https://kafka.js.org/ .

### Обязательные темы
JavaScript минимум для Java-инженера: object/array semantics, destructuring, closures, prototype/class, `this`, `undefined`/`null`, truthiness, equality, Map/Set, Promise, async iterables, ESM. Node: event loop/libuv, microtasks, single JS thread, worker_threads vs libuv pool, streams/backpressure, Buffer, `fs`/`path`/`process`, npm, `node:http`, middleware, config/env, graceful shutdown, error propagation, unhandled rejection/uncaughtException, Pino, Prometheus, `pg` pool/transactions, Drizzle/migrations/N+1, Redis, Kafka producer/consumer/offset/retry, unit/integration tests, Zod validation, security headers, JWT verification, Nest DI/modules/controllers/guards/pipes/interceptors/filters/lifecycle, code review.
Не преподавать заново SQL, HTTP/REST, Git, Docker/Kubernetes, CI/CD, OAuth/JWT-теорию, очереди, TDD, паттерны и мониторинг как концепции. Только Node-специфичные инструменты и отличия. Не добавлять GraphQL, gRPC, frontend, второй фреймворк, второй проект, Docker/Compose/K8s manifests или CI.

### Сквозной проект
**Ledger API** — учебный FinTech-подобный сервис аккаунтов и переводов, не платёжная система. Эволюция: CLI → raw HTTP → PostgreSQL → Redis/idempotency → security → observability → Kafka/outbox → NestJS refactor. Доменный/application слой переиспользуется.

Сценарии: создать customer/accounts; прочитать баланс и историю; перевести средства; идемпотентный повтор по `Idempotency-Key`; одинаковый ключ с иным payload даёт 409; атомарно записать transfer + две ledger entries + outbox event; publisher доставляет событие в Kafka; consumer идемпотентно обрабатывает повтор; graceful shutdown закрывает HTTP, Kafka, Redis и PG pool.

### Модель данных
- `customers(id uuid pk, email text unique, created_at timestamptz)`
- `accounts(id uuid pk, customer_id uuid fk, currency char(3), status text, created_at timestamptz)`
- `transfers(id uuid pk, from_account_id uuid fk, to_account_id uuid fk, amount_minor bigint, currency char(3), status text, idempotency_key text, request_hash text, created_at timestamptz)`
- `ledger_entries(id uuid pk, transfer_id uuid fk, account_id uuid fk, direction text, amount_minor bigint, created_at timestamptz)` — две записи на перевод: debit/credit.
- `idempotency_records(key text pk, request_hash text, response_json jsonb, created_at timestamptz, expires_at timestamptz)`
- `outbox_events(id uuid pk, aggregate_type text, aggregate_id uuid, event_type text, payload jsonb, created_at timestamptz, published_at timestamptz null, attempts int)`
- Индексы: accounts(customer_id), transfers(from_account_id,created_at desc), transfers(to_account_id,created_at desc), ledger_entries(account_id,created_at desc), partial index unpublished outbox.
- Деньги — integer minor units (`bigint` доменно; JSON decimal string), никогда float. PostgreSQL — source of truth. Конкурентные списания: транзакция и `SELECT FOR UPDATE` аккаунтов в стабильном порядке ID. JWT локально через `jose` и тестовый ключ/JWKS; реальный Keycloak не поднимать.

### Контракты приложения
`TransferService.transfer(command: TransferCommand): Promise<TransferResult>`
`AccountRepository.getByIdForUpdate(id: AccountId, tx: TransactionContext): Promise<Account | null>`
`TransferRepository.createTransferWithEntries(command: TransferCommand, tx: TransactionContext): Promise<Transfer>`
`IdempotencyStore.execute<T>(key: string, requestHash: string, operation: () => Promise<T>): Promise<T>`
`OutboxRepository.enqueue(event: DomainEvent, tx: TransactionContext): Promise<void>`
`EventPublisher.publish(event: OutboxEvent): Promise<void>`
`TokenVerifier.verify(token: string): Promise<Principal>`
`Clock.now(): Date`; `IdGenerator.next(): string`.
Порты — `src/application/ports/`; реализации — `src/infrastructure/`. Не протаскивать pg/Drizzle/Redis/KafkaJS типы в domain.

## 2. Правила для агента

### Порядок работы
Работать строго по одному модулю. Прочитать `plan.md` и один файл `modules/NN-*.md`; реализовать только его упражнения, тесты и solutions; выполнить `npm test`, `npm run typecheck`, `npm run lint`, `npm run verify:solutions`; обновить `PROGRESS.md`; только затем перейти дальше. Не генерировать все модули одним проходом. Если тест упал — исправить реализацию, не ослаблять тест.

### Шапка каждого упражнения
```ts
/**
 * Exercise NN
 * Topic: <English topic>
 * Java/Spring analogy: <аналогия и граница аналогии>
 * Requirements:
 * - <проверяемое требование>
 * Hints:
 * - <подсказка>
 * Trap: <типичная ошибка>
 * Run tests: npm test -- --test-name-pattern="<exercise-id>"
 */
```
После шапки — точные публичные типы/сигнатуры и TODO-заглушки. Не вставлять решение в starter.

### Тесты и решения
- На каждое упражнение отдельный `test/exercises/<exercise-id>.test.ts`.
- Эталон: `solutions/<module-id>/<exercise-id>.solution.ts`; не импортировать solution в production.
- `scripts/verify-solutions.ts` запускает полный набор тестов с эталонами, восстанавливает starter state даже при ошибке, возвращает non-zero при любом падении. Выбрать один детерминированный механизм подмены starter implementation; описать его в `docs/STACK.md`.
- Тесты проверяют контракт, edge cases, ошибки, async behavior, concurrency и cleanup, а не внутреннюю реализацию.
- `npm test` — unit + локальные тесты; `npm run test:integration` — интеграционные с внешними сервисами через env. Compose-файл не создавать.
- Starter tests должны падать ожидаемо до решения; solution tests должны быть зелёными.

### Стиль и запреты
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`; не использовать `any` без комментария.
- Не использовать sync I/O в request path, fire-and-forget Promise без обработки, `process.exit()` в runtime, глобальные mutable singletons.
- Любой внешний ввод (HTTP/env/Kafka) валидировать Zod; TS interface не является runtime validation.
- Ресурсы имеют владельца и явный close/disconnect; graceful shutdown идемпотентен и timeout-bounded.
- Не логировать tokens, Authorization, secrets, PII, полный request body. Prometheus labels только low-cardinality (`method`, `route`, `status_code`).
- Не добавлять зависимости, фреймворки, ORM, test runner сверх зафиксированного стека. Не создавать Docker/Compose/K8s/CI. Не использовать реальные финансовые данные/секреты.

## 3. План обучения

| Модуль | Темы | Время | Веха |
|---|---|---:|---|
| 00 Runtime и язык | JS/TS, ESM/npm, process/fs/path/Buffer | 3 ч | CLI читает конфиг и файл |
| 01 Async runtime | Promise, event loop/libuv, worker_threads, ошибки | 4 ч | CPU task вынесена в worker pool |
| 02 Streams | pipeline, Transform, backpressure, AbortSignal | 3 ч | потоковый CSV import |
| 03 Raw HTTP | node:http, router, middleware, body limits | 4 ч | API на чистом Node |
| 04 Config/lifecycle | Zod env, shutdown, signals, unhandled errors | 3 ч | корректный старт/остановка |
| 05 PostgreSQL | pg pool, SQL, tx, locks, Drizzle, migrations, N+1 | 5 ч | атомарный перевод и ledger |
| 06 Redis | node-redis, TTL, atomic claim, idempotency | 3 ч | повтор не дублирует перевод |
| 07 Security | Zod, headers, jose JWT, authorization | 4 ч | защищённые endpoints |
| 08 Observability | Pino, request context, prom-client, health | 3 ч | JSON logs + /metrics |
| 09 Kafka | KafkaJS, outbox, consumer, retries, offsets | 5 ч | event delivery + idempotent consumer |
| 10 Testing | node:test, integration, concurrency, fault injection | 4 ч | regression и invariants green |
| 11 NestJS | DI, modules, controllers, guards/pipes/interceptors/filters | 6 ч | тот же API на NestJS |
| **Итого** | | **47 ч** | |

## 4. Описание проекта и структура репозитория

### Готовые части
С самого начала создать package/lock/tsconfig/lint/format config, `.env.example`, `src/domain`, `src/application`, `src/infrastructure`, `src/transport`, `test`, `solutions`, `scripts`, `migrations`, `docs`, `PROGRESS.md`, deterministic clock/ID test helpers. Не создавать compose-файл; Postgres/Redis/Kafka уже запущены пользователем.

### Целевая структура
```text
plan.md  README.md  PROGRESS.md  package.json  package-lock.json
tsconfig.json eslint.config.js .prettierrc.json .nvmrc .env.example
modules/00-runtime-language.md ... modules/11-nestjs-refactor.md
src/{domain,application,infrastructure,transport}/
test/{exercises,unit,integration}/
solutions/00-runtime-language/ ... solutions/11-nestjs-refactor/
scripts/verify-solutions.ts migrations/
docs/{STACK.md,API.md,JAVA-SPRING-MAP.md,BRIDGE-TO-NEXT.md,ADR/}
```

### Таблица аналогий Java/Spring → Node
| Java/Spring | Node/Nest | Отличие |
|---|---|---|
| JVM | V8 + libuv + Node process | один основной JS thread |
| CompletableFuture | Promise | Promise не создаёт поток |
| Servlet container | node:http/event loop | нет thread-per-request |
| Filter/Interceptor | middleware/Nest interceptor | разные этапы pipeline |
| RestController | Nest Controller | HTTP adapter отдельно |
| Service/Component | Nest provider | в голом Node DI отсутствует |
| ConfigurationProperties | process.env + Zod | env — строки |
| Bean Validation | Zod + pipe | TS-типы исчезают в runtime |
| Hibernate/JPA | Drizzle + pg | нет identity map/lazy loading |
| HikariCP | pg.Pool | явный release client в finally |
| @Transactional | явный transaction callback | нет proxy transaction propagation |
| Spring Security | middleware/guard + jose | verify отдельно от authorization |
| Logback | Pino | структурированные поля |
| Micrometer | prom-client | метрики регистрируются явно |
| @KafkaListener | KafkaJS consumer loop | явные offsets/retry/shutdown |
| @PreDestroy | signal handler/Nest lifecycle | cleanup нужно организовать |
| JUnit/Mockito | node:test + fakes | async тесты должны await Promise |

## 5. Файлы модулей
Каждый файл самодостаточен, ≤300 строк: цель, prerequisites, краткая теория, файлы, точные сигнатуры, упражнения, тестовые проверки, ловушка, веха, checklist, quiz, cheat sheet. Агент читает только `plan.md` и текущий модуль.

- [00 Runtime и язык](modules/00-runtime-language.md)
- [01 Async runtime](modules/01-async-runtime.md)
- [02 Streams](modules/02-streams.md)
- [03 Raw HTTP](modules/03-raw-http.md)
- [04 Config и lifecycle](modules/04-config-lifecycle.md)
- [05 PostgreSQL](modules/05-postgresql.md)
- [06 Redis и идемпотентность](modules/06-redis-idempotency.md)
- [07 Security](modules/07-security.md)
- [08 Observability](modules/08-observability.md)
- [09 Kafka и outbox](modules/09-kafka-outbox.md)
- [10 Testing и hardening](modules/10-testing-hardening.md)
- [11 NestJS refactor](modules/11-nestjs-refactor.md)

## 6. Итоговые документы
- `README.md`: prerequisites, stack, install, npm commands, env, порядок модулей, учебные ограничения.
- `PROGRESS.md`: checklist по модулям/упражнениям, дата, веха, блокеры; отмечать только после зелёных gates.
- `docs/JAVA-SPRING-MAP.md`: расширенная аналогия по runtime, DI, web, DB, security, observability, Kafka, lifecycle.
- `docs/STACK.md`: versions, rationale, commands, constraints, official links.
- `docs/API.md`: endpoints, schemas, error envelope, idempotency semantics, event schema.
- `docs/BRIDGE-TO-NEXT.md`: следующий трек — Keycloak/OIDC, OpenAPI, OpenTelemetry, resilience, DB tuning, Kafka schema evolution, profiling, deployment adaptation.

## 7. Definition of Done и порядок работы агента

### DoD
- [ ] Все 12 файлов модулей существуют и каждый ≤300 строк.
- [ ] Каждая обязательная тема из раздела 1 встречается минимум в упражнении и проверяется тестом/квизом.
- [ ] У каждого упражнения есть starter, шапка, тест, solution.
- [ ] `npm ci`, typecheck, lint, test, verify:solutions проходят.
- [ ] Integration покрывает Postgres, Redis, Kafka, shutdown; env описаны.
- [ ] Поздние модули переиспользуют ранний код и имеют явные refactoring steps.
- [ ] Есть тесты конкурентных переводов, idempotency replay/conflict, rollback, повторной Kafka delivery.
- [ ] Nest API сохраняет контракты и бизнес-слой raw Node.
- [ ] Нет compose/Docker/K8s/CI, secrets, float money, high-cardinality metric labels.
- [ ] README/PROGRESS отражают реальное состояние.

### Порядок
1. Создать каркас и plan; не генерировать все упражнения.
2. Создать модуль 00, tests и solutions.
3. Прогнать `npm test`, `npm run typecheck`, `npm run lint`, `npm run verify:solutions`.
4. Обновить PROGRESS и перейти к 01. Повторить последовательно до 11.
5. После 03 подтвердить raw HTTP без фреймворка; после 05 — транзакции/locks; после 09 — outbox→Kafka→consumer с повторной доставкой.
6. Финально прогнать все gates и проверить каждую DoD строку.
7. При ограниченном контексте продолжать с ближайшего незавершённого упражнения; состояние хранить в PROGRESS. Контракты не менять без ADR.

### Матрица покрытия
| Тема | Где покрыть |
|---|---|
| Event loop/libuv/single thread | 01-01, 01-02 |
| worker_threads | 01-03 |
| Streams/backpressure | 02-02..04 |
| fs/path/process/Buffer | 00-02..04, 02 |
| node:http/middleware | 03-01..04 |
| env/config/shutdown | 04-01..04 |
| errors/unhandled rejection | 01-04, 04-04 |
| Pino/structured logs | 08-01..02 |
| Prometheus | 08-03..05 |
| pg pool/transactions/locks | 05-01..05 |
| Drizzle/migrations/N+1 | 05-03, 05-06 |
| Redis | 06-01..04 |
| Kafka client/offsets/retry | 09-01..06 |
| Unit/integration tests | 10-01..06 |
| validation/headers/JWT | 07-01..05 |
| NestJS/Spring mapping | 11-01..07 |
| TS runtime boundary/ESM/npm | 00-01..02 |

### Методические решения
`worker_threads` изучать для CPU-bound workloads, не для обычного I/O. Kafka не source of truth: outbox предотвращает dual-write. Redis — ускоритель/временная координация, PostgreSQL constraint — финальная гарантия идемпотентности. JWT проверять библиотекой, не писать crypto. NestJS вводить только после raw HTTP; модуль 11 — рефакторинг, не новый CRUD.

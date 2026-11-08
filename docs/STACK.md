# STACK

Версия спецификации: 1.0 (2026-11-08). Версии ниже закреплены `package-lock.json`;
`latest` в CI не используется.

## Runtime и язык

| Компонент                  | Версия           | Почему                                                                       |
| -------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| Node.js                    | 26.x Active LTS  | стабильный LTS на дату ТЗ; `.nvmrc` фиксирует major                          |
| TypeScript                 | 6.0.3            | `strict`, `NodeNext`, ESM; совместим с typescript-eslint                     |
| tsx                        | 4.23.15          | запуск TS/ESM и декораторов Nest без отдельной сборки                        |
| Zod                        | 4.6.7            | runtime-валидация env/HTTP/Kafka; тип выводится из схемы                     |
| Pino                       | 10.4.0           | структурированные JSON-логи, redaction                                       |
| prom-client                | 15.1.3           | Prometheus-метрики; зафиксирован ТЗ (пакет помечен deprecated, API стабилен) |
| jose                       | 6.2.15           | проверка JWT/JWKS без самописной криптографии                                |
| pg                         | 8.23.1           | node-postgres: pool, transactions, `FOR UPDATE`                              |
| Drizzle ORM / Kit          | 0.45.4 / 0.31.11 | тонкий typed query layer + миграции, SQL не скрыт                            |
| redis (node-redis)         | 6.3.1            | TTL, atomic claim, idempotency                                               |
| KafkaJS                    | 2.2.4            | producer/consumer, offsets, retry                                            |
| NestJS                     | 12.4.0           | DI/modules/guards/pipes/interceptors/filters; `@nestjs/platform-node`        |
| node:test + node:assert    | встроено         | unit/integration тесты без стороннего runner                                 |
| supertest                  | 7.3.2            | HTTP-тесты Nest/raw server                                                   |
| ESLint / typescript-eslint | 10.14.0 / 8.72.1 | flat config, type-aware правила                                              |
| Prettier                   | 3.9.10           | форматирование                                                               |

`@nestjs/platform-node` использует NodeAdapter, поэтому отдельный Express/Fastify не
добавляется. class-validator/class-transformer не используются: валидация — Zod.

## Деньги

- Домен и БД: `bigint` / `bigint` (minor units), никогда `float`/`double`.
- JSON: decimal string, например `"10.50"`.
- Валюта хранится рядом с суммой; арифметика между разными валютами запрещена.

## Механизм проверки решений

Выбран детерминированный **file-swap**:

1. `scripts/verify-solutions.ts` находит `solutions/**/*.solution.ts`.
2. Для каждого файла читает starter `src/exercises/<module>/<id>.ts` и сохраняет его
   содержимое в памяти.
3. Записывает эталон поверх starter. Относительные импорты совпадают, потому что
   `solutions/<module>/` и `src/exercises/<module>/` находятся на одной глубине.
4. Запускает `scripts/run-tests.ts --strict` (`EXERCISE_STRICT=1`), затем в `finally`
   восстанавливает **все** starter-файлы, даже при падении тестов или исключении.
5. Возвращает non-zero при любом падении.

`npm test` без strict-режима помечает нерешённые упражнения как `todo`; это позволяет
держать зелёными unit-тесты проекта во время прохождения курса. Строгая проверка
упражнений — `npm run test:exercises`.

## Импорты решений

`package.json` содержит subpath imports `#src/* -> ./src/*`. Starter-файлы используют
относительные импорты, а эталоны в `solutions/` — `#src/...`, чтобы typecheck и runtime
работали из обеих директорий и после file-swap.

## Команды

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run verify:solutions
npm run test:integration
```

`test:integration` включается `RUN_INTEGRATION_TESTS=true` и требует:
`DATABASE_URL`, `REDIS_URL`, `KAFKA_BROKERS` (см. `.env.example`).

## Ограничения

- Нет Docker/Compose/K8s/CI.
- Нет GraphQL/gRPC/frontend/второго фреймворка.
- Нет `process.exit()` в runtime; только `process.exitCode` в CLI и controlled shutdown.
- Нет sync I/O в request path, fire-and-forget Promise, глобальных mutable singletons.
- Не логируются токены, `Authorization`, секреты, PII и полные тела запросов.
- Integration-тесты не запускаются без внешних сервисов; compose не создаётся.

## Официальные ссылки

- Node release schedule: https://nodejs.org/en/about/previous-releases
- Node docs: https://nodejs.org/docs/latest-v26.x/api/
- TypeScript NodeNext: https://www.typescriptlang.org/docs/handbook/modules.html
- NestJS: https://docs.nestjs.com/
- Drizzle + PostgreSQL: https://orm.drizzle.team/docs/get-started-postgresql
- node-postgres: https://node-postgres.com/
- KafkaJS: https://kafka.js.org/
- node:test: https://nodejs.org/api/test.html

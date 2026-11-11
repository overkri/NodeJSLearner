# Node.js для бэкенд-разработки: Ledger API

**Версия 1.0.0** · Node.js 26 Active LTS · TypeScript strict + ESM

Учебный трек для Java/Spring-инженера. Один сквозной проект — **Ledger API** — растёт от
CLI и `node:http` до PostgreSQL, Redis, security, observability, Kafka/outbox и NestJS.
Это не платёжная система и не production-шаблон.

- Полная спецификация: [`plan.md`](plan.md)
- Модули курса: [`modules/`](modules/)
- История версий: [`CHANGELOG.md`](CHANGELOG.md)

## Что входит в 1.0.0

- 12 модулей и 59 упражнений: starter, contract tests и reference solution для каждого.
- 267 локальных тестов; `verify:solutions` подставляет все эталоны и восстанавливает starter.
- Сквозной сценарий: customer → account → transfer, идемпотентность, ledger entries и
  outbox event.
- CLI `inspect-config`, raw HTTP API на `node:http` и тот же API на NestJS 12 + NodeAdapter.
- PostgreSQL schema/migrations, Redis locks/idempotency, Zod + security headers + JWT,
  Pino + AsyncLocalStorage + Prometheus, KafkaJS/outbox, testing helpers.
- Env-gated integration-тесты для PostgreSQL, Redis, Kafka и HTTP shutdown.

> **Демо-контур.** `npm run dev:http` и `npm run dev:nest` поднимают API на in-memory
> `LedgerService`: данные исчезают при перезапуске, а PostgreSQL, Redis, Kafka, JWT,
> метрики и rate limiting в демо не подключены. Эти темы отрабатываются в упражнениях и
> integration-тестах. [`docs/API.md`](docs/API.md) описывает целевой контракт курса;
> фактический набор маршрутов демо — `/health`, `/customers`, `/accounts`, `/transfers`.

## Требования

- Node.js **26 Active LTS** (`.nvmrc`), npm 11+
- PostgreSQL, Redis и Kafka — только для интеграционных тестов и поздних модулей; курс не
  создаёт Docker/Compose/Kubernetes-манифесты и предполагает, что сервисы уже запущены
- Git

## Установка

```bash
git clone <repo>
cd NodeJSLearner
nvm use            # или установите Node 26 вручную
npm ci
cp .env.example .env
```

`npm`-скрипты не загружают `.env` автоматически. Для integration-тестов и поздних модулей
экспортируйте переменные в окружение средствами вашей оболочки или запускайте Node напрямую
с `--env-file=.env`. `.env.example` — шаблон, реальные секреты в репозиторий не попадают.

## Команды

| Команда                                                 | Назначение                                                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm test`                                              | unit-тесты + упражнения; нерешённые TODO показываются как `todo` и не ломают прогон          |
| `npm run test:exercises -- --test-name-pattern="00-01"` | строгий прогон упражнений: TODO и падения считаются ошибкой                                  |
| `npm run verify:solutions`                              | подставляет эталоны из `solutions/`, прогоняет весь локальный набор, восстанавливает starter |
| `npm run verify:solutions -- --module=05`               | то же для одного модуля                                                                      |
| `npm run typecheck`                                     | `tsc --noEmit`, strict + NodeNext                                                            |
| `npm run lint`                                          | ESLint flat config + typescript-eslint                                                       |
| `npm run format` / `format:check`                       | Prettier                                                                                     |
| `npm run test:integration`                              | только `test/integration`, нужны внешние сервисы и env                                       |
| `npm run cli:inspect -- ./ledger.config.json`           | CLI модуля 00                                                                                |
| `npm run dev:http`                                      | Ledger API на чистом `node:http` (in-memory demo)                                            |
| `npm run dev:nest`                                      | тот же Ledger API на NestJS + NodeAdapter                                                    |
| `npm run db:generate`                                   | генерация SQL из Drizzle schema; канонические миграции — файлы в `migrations/`               |

`db:migrate` из `drizzle-kit` не является основным способом применения миграций в этом
репозитории: SQL в `migrations/` написан вручную, а integration-тест применяет его напрямую.
Перед изменением схемы сверяйте `src/infrastructure/db/schema.ts` и SQL-файлы.

## Как устроен курс

1. Прочитайте `plan.md` и **один** файл `modules/NN-*.md`.
2. Реализуйте упражнения в `src/exercises/NN-*/NN-MM.ts` по шапке и сигнатурам.
3. Запускайте точечные тесты: `npm run test:exercises -- --test-name-pattern="NN-MM"`.
4. Сверяйтесь с `solutions/NN-*/NN-MM.solution.ts` только после попытки.
5. После зелёных `typecheck`, `lint`, `test:exercises` и `verify:solutions` переходите к
   следующему упражнению.

Механизм проверки эталонов: `scripts/verify-solutions.ts` копирует каждый
`*.solution.ts` поверх соответствующего starter-файла, запускает полный локальный набор с
`EXERCISE_STRICT=1` и **всегда** восстанавливает starter в `finally`. Подробности —
[`docs/STACK.md`](docs/STACK.md), соглашения авторства — [`docs/AUTHORING.md`](docs/AUTHORING.md).

## Статус 1.0.0

Состояние на 2026-11-08:

- 12/12 модулей и 59/59 упражнений добавлены; у каждого есть starter, тест и эталон.
- `npm test`: unit-тесты зелёные, 255 тестов нерешённых упражнений показываются как `todo`.
- `npm run verify:solutions`: 267/267 тестов проходят с эталонами, starter восстановлен.
- `npm run typecheck`, `npm run lint`, `npm run format:check` проходят.
- `test/integration` содержит Postgres/Redis/Kafka/shutdown сценарии, включаемые только
  через env (`RUN_INTEGRATION_TESTS=true`).

## Структура репозитория

| Путь                  | Назначение                                                     |
| --------------------- | -------------------------------------------------------------- |
| `plan.md`             | спецификация курса и Definition of Done                        |
| `modules/`            | 12 самодостаточных модулей с теорией, упражнениями и checklist |
| `src/domain/`         | деньги, аккаунты, переводы, ошибки, события                    |
| `src/application/`    | `LedgerService`, порты репозиториев/часов/генераторов          |
| `src/infrastructure/` | PostgreSQL pool/schema, Redis, Kafka, lifecycle                |
| `src/transport/`      | raw HTTP и NestJS API                                          |
| `src/exercises/`      | starter-файлы упражнений с TODO                                |
| `solutions/`          | эталоны для `verify:solutions`                                 |
| `test/`               | unit, exercises, integration и общие helpers                   |
| `migrations/`         | канонические SQL-миграции                                      |
| `scripts/`            | запуск тестов и проверка эталонов                              |
| `docs/`               | stack, API, Java/Spring map, bridge, ADR и правила авторства   |

## Ограничения курса

- Только Node.js-специфичные темы; SQL, HTTP, Git, Docker/K8s, CI/CD, OAuth-теория и
  паттерны считаются известными.
- Никаких Docker/Compose/K8s/CI, реальных секретов и финансовых данных.
- Запускаемый демо-API использует in-memory `LedgerService`; PostgreSQL, Redis, Kafka,
  JWT, метрики и rate limiting не подключены к `dev:http`/`dev:nest`.
- Деньги — целые minor units (`bigint`), в JSON — decimal string; float запрещён.
- Метрики — только low-cardinality labels (`method`, `route`, `status_code`).
- Поздние модули переиспользуют domain/application слой; контракты меняются только через ADR.
- Integration-тесты не запускаются без внешних сервисов; compose-файл не создаётся.

## Версионирование

Проект следует [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html). Текущая версия — **1.0.0**:

- **MAJOR** — несовместимые изменения публичного API, domain/event-контрактов,
  сигнатур или тестов упражнений, удаление модулей/упражнений.
- **MINOR** — новые модули, упражнения, endpoints, обратно совместимые возможности и
  опциональные настройки.
- **PATCH** — обратно совместимые исправления, тесты, документация и внутренний рефакторинг.

Версия хранится в `package.json` и `package-lock.json`, изменения фиксируются в
[`CHANGELOG.md`](CHANGELOG.md), а релиз помечается тегом `vX.Y.Z` после прохождения
проверок из раздела «Команды».

## Лицензия

Код и материалы курса распространяются по лицензии [MIT](LICENSE).
Copyright (c) 2026 OverKri.

## Документы

- [`docs/STACK.md`](docs/STACK.md) — версии, rationale, ограничения, ссылки
- [`docs/AUTHORING.md`](docs/AUTHORING.md) — правила генерации упражнений/решений
- [`docs/API.md`](docs/API.md) — целевые endpoints, schemas, ошибки, идемпотентность, события
- [`docs/JAVA-SPRING-MAP.md`](docs/JAVA-SPRING-MAP.md) — расширенная карта аналогий
- [`docs/BRIDGE-TO-NEXT.md`](docs/BRIDGE-TO-NEXT.md) — что изучать после курса
- [`docs/ADR/0001-money-and-transactions.md`](docs/ADR/0001-money-and-transactions.md) — деньги и транзакции
- [`CHANGELOG.md`](CHANGELOG.md) — история релизов

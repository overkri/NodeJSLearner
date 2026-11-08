# Модуль 11. NestJS refactor

**Время:** 6 ч. **Предварительные требования:** модули 03–10; raw HTTP API работает.
**Веха:** тот же Ledger API на NestJS + `@nestjs/platform-node` (NodeAdapter), без Express/Fastify.

## Цель

Перевести уже понятый HTTP lifecycle в Nest: DI, modules, controllers, pipes, guards,
interceptors, filters, lifecycle. Не выучить новый CRUD, а увидеть, какие слои Nest
автоматизирует, а какие решения остаются явными.

## Теория

### Bootstrap

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NodeAdapter } from '@nestjs/platform-node';

const app = await NestFactory.create(AppModule, new NodeAdapter());
await app.listen(3000);
```

- Nest 12: адаптер передаётся вторым аргументом, не через `options.adapter`.
- `NodeAdapter` работает напрямую на `node:http`; Express/Fastify не нужны.
- `reflect-metadata` должен быть импортирован до декораторов.
- `tsconfig`: `experimentalDecorators`, `emitDecoratorMetadata`.
- `app.enableShutdownHooks()` подключает сигналы; в курсе shutdown-координатор остаётся
  явным (модуль 04).

### DI

```ts
export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

@Injectable()
export class AccountsService {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly repo: AccountRepositoryPort) {}
}
```

- Nest строит граф зависимостей; класс-токен работает без `@Inject`, Symbol — с `@Inject`.
- Провайдеры регистрируются в module; без регистрации — `UnknownDependenciesException`.
- Не создавайте зависимости через `new` внутри сервиса.
- Scope: singleton по умолчанию; request-scoped providers дороже.
- Тесты: `Test.createTestingModule({providers})`, `module.get`, `module.close`.

### Modules

- `@Module({ controllers, providers, exports, imports })`.
- Feature module инкапсулирует компоненты; экспортируйте только публичные.
- Dynamic module (`forRoot(repository)`) передаёт инфраструктуру без глобальных синглтонов.
- `@Global()` — редкое исключение, не способ борьбы с циклическими импортами.

### Controllers и pipes

- `@Controller('transfers')` + `@Post()`; HTTP-адаптер отделён от domain.
- Параметры: `@Body`, `@Param`, `@Query`, `@Headers`.
- Nest 12 `StandardSchemaValidationPipe` умеет Zod/Standard Schema:

```ts
@Post()
create(@Body({ schema: transferBodySchema }) body: TransferDto) { ... }
```

- Pipe трансформирует значение (Zod `.transform`), ошибки → 400.
- Не использовать class-validator/class-transformer: стек зафиксирован на Zod.
- DTO — тип, выведенный из схемы; runtime-проверка всё равно нужна.

### Guards

- `CanActivate` выполняется после middleware, до pipes/handler.
- Guard возвращает boolean/Promise/ Observable; `false` → 403, исключение → его статус.
- JWT guard: извлечь Bearer, verify через порт, положить `request.principal`.
- 401 — не аутентифицирован; 403 — нет прав (authorization policy отдельно).

### Interceptors

- Обёртка вокруг handler на RxJS; подходит для timing, logging, mapping, caching.
- `next.handle().pipe(tap(...))`; `finalize` выполняется при success/error.
- Interceptor не заменяет middleware (body parsing, headers) и не guard.
- Не логировать body/token; route label — шаблон.

### Exception filters

- `@Catch()` ловит исключения; `@Catch(HttpException)` — только HTTP.
- Единый envelope: `{ error: { code, message, requestId } }`.
- Неизвестная ошибка → 500 без stack/message.
- Проверять `headersSent`; второй ответ ломает соединение.
- `HttpException` payload может быть строкой/объектом/массивом сообщений.

### Lifecycle

- `OnModuleInit`, `OnApplicationBootstrap`, `OnModuleDestroy`, `BeforeApplicationShutdown`,
  `OnApplicationShutdown`.
- `app.close()` вызывает hooks и освобождает ресурсы; повторный close должен быть безопасен.
- Порядок shutdown: перестать принимать HTTP → Kafka/Redis → PG.
- Nest lifecycle не отменяет необходимость timeout-bounded координатора.

### Что остаётся явным

Nest не решает за вас:

- транзакции и locks PostgreSQL;
- идемпотентность/outbox;
- Kafka offsets/retry;
- timeout и graceful shutdown;
- redaction логов;
- low-cardinality метрики;
- security headers (используйте middleware/hook).

## Файлы модуля

```text
src/exercises/11-nestjs/11-01.ts ... 11-07.ts
solutions/11-nestjs/*.solution.ts
test/exercises/11-nestjs/*.test.ts
```

## Упражнения

### 11-01. DI token

```ts
const ACCOUNT_REPOSITORY = Symbol(...)
@Injectable() class AccountsService { balanceOf(id): Promise<bigint> }
```

- constructor injection by token; Test module; no hidden `new`.
- Проверки: fake repo, bigint, no concrete construction.

### 11-02. Dynamic module

```ts
AccountsModule.forRoot(repository): DynamicModule
```

- providers token + service; exports service; consumer resolves.
- Проверки: module compile, metadata, exports.

### 11-03. StandardSchemaValidationPipe

```ts
createTransferBodySchema(): ZodType
validateTransferBody(value): Promise<unknown>
```

- UUID/currency/decimal validation; amount → bigint transform; same accounts;
- invalid → Nest `BadRequestException`; unknown keys.

### 11-04. JWT guard

```ts
@Injectable() class JwtAuthGuard implements CanActivate
```

- Bearer extraction, verifier port, principal on request;
- missing/invalid → UnauthorizedException; no token leak.

### 11-05. Timing interceptor

```ts
@Injectable() class TimingInterceptor implements NestInterceptor
```

- method/route/status/duration; error log sanitized; rethrow;
- injectable now; route template.

### 11-06. Exception filter

```ts
@Catch() class HttpExceptionFilter implements ExceptionFilter
```

- HttpException mapping; 500 generic; requestId; headersSent guard;
- validation array messages; sanitize.

### 11-07. Nest app + lifecycle

```ts
createLedgerNestApp(): Promise<INestApplication>
class ShutdownService implements OnApplicationShutdown
```

- NodeAdapter, init, global filter, GET /health;
- `app.close()` triggers hook; repeated close safe;
- ephemeral port in test.

## Мини-проект: Ledger API на Nest

- `AppModule` импортирует `AccountsModule`, `TransfersModule`, `HealthModule`.
- `TransfersController` использует Zod pipe, JWT guard, interceptor и idempotency
  coordinator; domain/application слой переиспользуется из raw Node.
- Global filter + security headers middleware.
- `app.close()` + `ShutdownCoordinator` закрывают HTTP/Kafka/Redis/PG.
- Контракты endpoints не меняются; raw HTTP тесты можно переиспользовать.

## Команды

```bash
npm run test:exercises -- --test-name-pattern="11-"
npm run verify:solutions -- --module=11 --test-name-pattern="11-"
npm run typecheck
npm run lint
```

## Checklist

- [ ] NodeAdapter, без Express/Fastify.
- [ ] DI через токены; нет `new` зависимостей.
- [ ] Feature/dynamic modules с явными exports.
- [ ] Zod + StandardSchemaValidationPipe, не class-validator.
- [ ] Guard отделяет authentication; policy — authorization.
- [ ] Interceptor не логирует секреты; route template.
- [ ] Filter отдаёт единый envelope и не пишет после headersSent.
- [ ] Lifecycle hooks + timeout-bounded shutdown.
- [ ] Транзакции/идемпотентность/outbox остаются в application/infrastructure.

## Quiz

1. Чем provider отличается от обычного класса?
2. Почему Symbol-токену нужен `@Inject`?
3. Где в Nest выполняется guard относительно pipe?
4. Чем interceptor отличается от middleware?
5. Что делает `app.close()`?
6. Почему Nest не отменяет необходимость outbox/транзакций?
7. Почему NodeAdapter, а не Express?

<details><summary>Ответы</summary>

1. Provider управляется контейнером (создание/внедрение/lifecycle), класс — просто тип.
2. По типу Symbol нельзя получить metadata; токен задаётся явно.
3. Guard — до pipes и handler, после middleware.
4. Interceptor оборачивает handler и работает с RxJS; middleware — до routing/guards.
5. Запускает lifecycle hooks, закрывает HTTP-сервер и контекст.
6. Это инфраструктурные гарантии; Nest лишь вызывает ваш код.
7. Цель — увидеть низкоуровневый HTTP lifecycle без скрытого фреймворка.

</details>

## Cheat sheet

```ts
NestFactory.create(AppModule, new NodeAdapter());
@Injectable() class S { constructor(@Inject(TOKEN) private readonly dep: Port) {} }
@Catch() class F implements ExceptionFilter { catch(e, host) { ... } }
next.handle().pipe(tap({ finalize: () => log() }));
await app.close();
```

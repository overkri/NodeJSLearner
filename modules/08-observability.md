# Модуль 08. Observability

**Время:** 3 ч. **Предварительные требования:** модули 03–07.
**Веха:** JSON logs с request context + `/metrics` + health checks.

## Цель

Сделать поведение сервиса наблюдаемым: структурированные логи без секретов, correlation id,
Prometheus-метрики с низкой кардинальностью и health/readiness probes.

## Теория

### Structured logging (Pino)

- Лог — JSON-объект с полями, а не строка с конкатенацией.
- Обязательные поля: `time`, `level`, `service`, `msg`, `requestId`, `route`.
- Pino пишет в stdout; сборщик (Loki/ELK) разбирает JSON.
- Redaction настраивается в logger-е, а не в сборщике:

```ts
redact: {
  paths: ['authorization', 'token', 'password', 'req.headers.authorization'],
  censor: '[REDACTED]',
}
```

- Не логируйте тела запросов, PAN/CVV, email в открытом виде, JWT.
- Child logger: `logger.child({ requestId, route })` — не передавайте context в каждый вызов.
- Уровни: debug в dev, info в prod; error — только реальные сбои.

### Request context

`AsyncLocalStorage` хранит контекст вдоль async-цепочки:

```ts
await runWithRequestContext({ requestId, route }, async () => {
  logger.info('start');
  await service.call(); // context доступен внутри
});
```

- В отличие от `ThreadLocal`, контекст не привязан к потоку и переживает `await`.
- Не храните в нём raw request/headers/token.
- Контекст должен быть immutable; concurrent requests изолированы.
- Nest: используйте ALS в interceptor/middleware, не глобальную переменную.

### Prometheus (prom-client)

- `Counter` — монотонные события (`http_requests_total`).
- `Histogram` — распределение длительности (`http_request_duration_seconds`).
- Labels — только low-cardinality: `method`, `route`, `status_code`.
- `route` — шаблон (`/accounts/:id`), не сырой URL.
- Нельзя labels: `userId`, `accountId`, `requestId`, email, сумма.
- `/metrics` обычно закрыт от публичного интернета.
- Registry создаётся на приложение; тесты используют отдельный Registry.

### Health / readiness

- **Liveness** (`/health`): процесс жив, не проверяет зависимости.
- **Readiness** (`/ready`): можно принимать трафик; проверяет PG/Redis/Kafka.
- Каждая проверка ограничена timeout; зависшая зависимость не должна вешать probe.
- Ready отдаёт 503 при degraded, но не раскрывает stack/DSN/секреты.
- Проверки выполняются параллельно; время и статус фиксируются.

### Корреляция

- `requestId` из безопасного заголовка или UUID; возвращается клиенту.
- Логи, метрики (не как label) и ошибки используют один id.
- Outbox/Kafka события несут `eventId`/`correlationId` для трассировки.
- OpenTelemetry — следующий шаг (`BRIDGE-TO-NEXT.md`).

## Файлы модуля

```text
src/exercises/08-observability/08-01.ts ... 08-05.ts
solutions/08-observability/*.solution.ts
test/exercises/08-observability/*.test.ts
```

## Упражнения

### 08-01. Pino logger

```ts
createLogger(options: {
  level: string;
  serviceName?: string;
  stream?: NodeJS.WritableStream;
}): Logger
```

- JSON, service base field, ISO time;
- redaction authorization/token/password/secret и request headers;
- level filtering; тестовый stream.

**Проверки:** поля/уровень, redaction, level.
**Ловушка:** логировать body целиком; надеяться на сборщик.

### 08-02. AsyncLocalStorage

```ts
runWithRequestContext(context, callback): Promise<T>
getRequestContext(): RequestContext | undefined
requireRequestContext(): RequestContext
```

- context переживает await/nested async; concurrent isolation;
- frozen/validated; outside → undefined/error.

**Проверки:** await, concurrency, missing, freeze, validation.
**Ловушка:** module-level `let current`.

### 08-03. Prometheus metrics

```ts
createHttpMetrics(): HttpMetrics
getMetricsRegistry(metrics): Registry
```

- counter + histogram с labels method/route/status_code;
- валидация label values; отдельный Registry на инстанс;
- repeated labels → одна серия.

**Проверки:** exposition, агрегация, validation, isolation.
**Ловушка:** raw URL/userId label.

### 08-04. Health checks

```ts
runHealthChecks(checks, { timeoutMs?, now? }): Promise<{
  status: 'ok' | 'degraded';
  checks: { name; status; durationMs; error? }[];
}>
```

- параллельно, order preserved; timeout на check; ошибки generic;
- duplicate/empty names и timeout validation.

**Проверки:** healthy, failed, hung, injectable clock, validation.
**Ловушка:** Promise.all без timeout; утечка DB error.

### 08-05. Metrics endpoint

```ts
normalizeRouteLabel(pathname): string
renderMetrics(registry): Promise<{ contentType; body }>
```

- UUID/числа → `:id`; invalid/trailing slash/long segment → error;
- content type registry; ошибка registry без деталей.

**Проверки:** normalization, exposition, error wrapping.
**Ловушка:** normalizing at scrape time; raw dynamic path.

## Мини-проект

Request flow:

1. request id + child logger;
2. `runWithRequestContext`;
3. metrics middleware (route template + status);
4. handler;
5. access log (без body/token);
6. error log sanitized;
7. `/health` (liveness) и `/ready` (PG/Redis/Kafka) с таймаутами.

## Команды

```bash
npm run test:exercises -- --test-name-pattern="08-"
npm run verify:solutions -- --module=08 --test-name-pattern="08-"
npm run typecheck
npm run lint
```

## Checklist

- [ ] Логи структурированные, с requestId/route, без секретов.
- [ ] Redaction настроен до записи.
- [ ] Контекст через ALS, не глобальная переменная.
- [ ] Метрики имеют только low-cardinality labels.
- [ ] Route в метрике — шаблон.
- [ ] Health/readiness разделены, проверки с timeout.
- [ ] `/metrics` не публичный.

## Quiz

1. Почему `requestId` нельзя использовать как Prometheus label?
2. Чем liveness отличается от readiness?
3. Зачем redaction в logger, если сборщик тоже умеет?
4. Почему ALS лучше `ThreadLocal`-подобной глобальной переменной?
5. Что случится с метриками при raw URL label?
6. Какие поля нельзя писать в лог?

<details><summary>Ответы</summary>

1. Уникальные значения создают неограниченное число time series.
2. Liveness — процесс жив; readiness — готов принимать трафик с учётом зависимостей.
3. Секрет может уйти в stdout/файл до сборщика; защита должна быть на источнике.
4. Контекст следует за async-цепочкой и изолирован между запросами.
5. Кардинальность взорвётся, Prometheus замедлится/упадёт.
6. Токены, Authorization, пароли, PII, тела запросов, PAN/CVV.

</details>

## Cheat sheet

```ts
logger.info({ requestId, route }, 'request');
await runWithRequestContext({ requestId, route }, () => handler());
counter.inc({ method, route: '/accounts/:id', status_code: '200' });
histogram.observe({ method, route, status_code }, seconds);
```

# Модуль 10. Testing и hardening

**Время:** 4 ч. **Предварительные требования:** модули 03–09.
**Веха:** regression suite с конкурентными сценариями, fault injection и env-gated integration.

## Цель

Сделать тесты надёжными и воспроизводимыми: без `sleep`, без реального времени/random,
с явными fake clock/id, barrier для гонок и controlled fault injection.

## Теория

### node:test

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

void test('adds', async () => {
  assert.equal(1 + 1, 2);
});
```

- `test()` возвращает Promise; в top-level без `void`/`await` тест может не выполниться;
- `--test-name-pattern` фильтрует по имени;
- `t.skip`, `t.todo`, `t.diagnostic`;
- `assert.deepEqual` для структур, `strictEqual` для примитивов/ссылок;
- `assert.rejects`/`throws` — только с проверкой ошибки, не «любая ошибка»;
- тесты по умолчанию изолированы по файлам, но глобальное состояние модуля сохраняется.

### Determinism

- `Date.now()`/`new Date()` → порт `Clock` + `FixedClock`;
- `randomUUID()` → `IdGenerator` + `SequentialIdGenerator`;
- `setTimeout` в тесте → injected `sleep`/`now`;
- `Math.random` → явный seed/детерминированный выбор;
- порядок Promise/event loop не гарантируйте без barrier.

### Concurrency tests

- `Deferred<T>` — вручную управлять завершением операции;
- `Barrier` — отпустить N запросов одновременно;
- счётчики active/max active;
- проверяйте не только результат, но и инварианты (баланс, отсутствие дублей);
- cleanup в `finally`, иначе тест-раннер зависнет.

### HTTP tests

- ephemeral port (`listen(0)`), не 3000;
- `fetch`/supertest, `closeAllConnections` для keep-alive;
- проверяйте status, headers, envelope, отсутствие секретов;
- реальный сервер лучше мока роутера, но unit-тесты handler-а быстрее.

### Fault injection

- stub, который падает N раз, затем делегирует;
- проверяйте retry/backoff/rollback;
- отдельно тестируйте timeout, disconnect, commit failure;
- не полагайтесь на реальную сеть в unit-тестах.

### Integration gates

`test/integration` запускается только при `RUN_INTEGRATION_TESTS=true`.
Требуемые env проверяются явно; пустые значения считаются отсутствующими.
Никаких Compose-файлов; сервисы предоставляет пользователь.

### Hardening checklist

- нет `any` без причины; внешний ввод валидируется;
- деньги только bigint;
- нет float/`Number` для сумм;
- нет fire-and-forget Promise;
- нет `process.exit()` в runtime;
- ошибки не содержат секретов;
- shutdown/cleanup в `finally`;
- тесты не зависят от порядка выполнения.

## Файлы модуля

```text
src/exercises/10-testing-hardening/10-01.ts ... 10-06.ts
solutions/10-testing-hardening/*.solution.ts
test/exercises/10-testing-hardening/*.test.ts
test/integration/kafka.test.ts (env-gated, module 09)
```

## Упражнения

### 10-01. waitFor

```ts
waitFor<T>(probe, { timeoutMs?, intervalMs?, now?, sleep? }): Promise<T>
```

- non-undefined value; probe errors retried; last error as cause;
- timeout/interval validation; injectable clock/sleep.

**Проверки:** immediate/retry, timeout cause, fake clock, validation.
**Ловушка:** бесконечный polling; truthiness вместо `!== undefined`.

### 10-02. FixedClock / SequentialIdGenerator

```ts
class FixedClock implements Clock {
  now();
  advance(ms);
}
class SequentialIdGenerator implements IdGenerator {
  next(): string;
}
```

- copies of Date; advance >=0; deterministic ids with prefix/width;
- validation.

**Проверки:** isolation, advance, format, invalid config.
**Ловушка:** возвращать тот же Date; сбрасывать счётчик.

### 10-03. Test HTTP server

```ts
startTestServer(handler): Promise<{ baseUrl; close(): Promise<void> }>
```

- listen 0 on 127.0.0.1; idempotent close; closeAllConnections.

**Проверки:** fetch, keep-alive close, repeated close.
**Ловушка:** фиксированный порт; незакрытые сокеты.

### 10-04. Deferred / Barrier

```ts
createDeferred<T>(): { promise; resolve; reject }
class Barrier { wait(); release(); waiting }
```

- settle-once; barrier releases all at count/release; validation.

**Проверки:** resolve/reject once, N waiters, manual release.
**Ловушка:** sleep вместо barrier; unhandled rejection.

### 10-05. Failure injection

```ts
injectFailures(operation, { failures, errorFactory? }): {
  run; attempts(); failuresRemaining(); reset();
}
```

- first N calls reject, then delegate; sync throws normalized; reset.

**Проверки:** sequence, reset, zero failures, sync throw, validation.
**Ловушка:** случайные сбои; общее состояние между тестами.

### 10-06. Integration gate

```ts
integrationEnabled(env): boolean
requireIntegrationEnv(names, env): Readonly<Record<string,string>>
integrationSkipReason(env): string | false
```

- exact `true` (trim/case); required names unique/non-empty;
- missing/blank values → error без значений; frozen result.

**Проверки:** flag variants, required values, missing, duplicates, skip reason.
**Ловушка:** silent skip; значения секретов в ошибке.

## Мини-проект

- unit: чистые domain/application + fakes;
- integration: Postgres/Redis/Kafka только по флагу;
- concurrency: barrier + два перевода;
- fault injection: Redis down, Kafka publish failure, commit failure;
- regression: idempotency replay/conflict, rollback, повторная Kafka delivery.

## Команды

```bash
npm run test:exercises -- --test-name-pattern="10-"
npm run verify:solutions -- --module=10 --test-name-pattern="10-"
npm test
RUN_INTEGRATION_TESTS=true npm run test:integration
npm run typecheck
npm run lint
```

## Checklist

- [ ] Нет sleep-based ожиданий; есть waitFor/barrier.
- [ ] Clock/id инжектируются; тесты детерминированы.
- [ ] HTTP-сервер на ephemeral port и закрывается.
- [ ] Fault injection проверяет retry/rollback.
- [ ] Integration явно gated и требует env.
- [ ] Cleanup в finally; тесты не висят.
- [ ] Проверяются инварианты, а не только happy path.

## Quiz

1. Почему `void test(...)`/`await test(...)` важен?
2. Чем barrier лучше `setTimeout(10)`?
3. Почему `assert.throws(fn)` без matcher опасен?
4. Как тестировать retry, не замедляя suite?
5. Почему integration нельзя silently skip?
6. Какие ресурсы нужно закрывать в тестах?

<details><summary>Ответы</summary>

1. Без ожидания top-level тест может завершиться раньше выполнения.
2. Barrier синхронизирует реальное состояние, sleep — догадка и flaky.
3. Он проходит на любой ошибке, включая NotImplementedError/опечатку.
4. Inject sleep/now и считать вызовы; без реальных задержек.
5. Можно принять сломанную интеграцию за зелёный suite.
6. HTTP server/connections, pool, Redis, Kafka producer/consumer, temp files.

</details>

## Cheat sheet

```ts
const barrier = new Barrier(2);
const deferred = createDeferred<number>();
await waitFor(() => probe(), { timeoutMs: 1000, intervalMs: 10 });
injectFailures(op, { failures: 2, errorFactory: () => new Error('down') });
```

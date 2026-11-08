# Модуль 04. Config и lifecycle

**Время:** 3 ч. **Предварительные требования:** модули 00–03.
**Веха:** корректный старт/остановка: env validated, SIGTERM идемпотентен, ошибки процесса
не игнорируются.

## Цель

Настроить приложение предсказуемо и безопасно завершать его. В Java многое делает
контейнер; в Node старт, shutdown и fatal errors — ответственность приложения.

## Теория

### Конфигурация

- `process.env` — **только строки** и `undefined`. `PORT=''` не равен отсутствию.
- Внешний ввод (env, файл, HTTP) валидируйте в runtime. TypeScript-интерфейс исчезает.
- Zod даёт схему, coercion и тип одновременно:

```ts
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
});
const config = schema.parse(process.env);
```

- Ошибка конфигурации должна падать на старте (fail fast), а не в первом запросе.
- Сообщения об ошибках не должны содержать значения секретов (`DATABASE_URL` с паролем).
- Конфиг иммутабелен: `Object.freeze`, `readonly`, не мутируйте env.

### Precedence

Порядок: defaults < config file < env < CLI (если есть). `undefined` из файла не должен
затирать default. Пустая строка в env — обычно ошибка, а не «нет значения».

### Graceful shutdown

1. Получить `SIGTERM`/`SIGINT`.
2. Перестать принимать новую работу (HTTP server close).
3. Дождаться in-flight запросов (с таймаутом).
4. Закрыть Kafka consumer/producer, Redis, PG pool.
5. Выйти с корректным кодом.

Свойства хорошего shutdown:

- **идемпотентен**: второй сигнал не запускает второй shutdown;
- **timeout-bounded**: зависший ресурс не держит процесс вечно;
- **порядок явный**: HTTP → Kafka → Redis → PG (или обоснованный другой);
- **ошибки собираются**, но не мешают закрыть остальные ресурсы;
- **состояние** наблюдаемо (`running`, `shutting-down`, `stopped`).

`server.close()` ждёт завершения соединений; `closeAllConnections()` — аварийный вариант.
В Nest lifecycle hooks (`onModuleDestroy`, `beforeApplicationShutdown`) нужно связать с
этими же сигналами.

### Fatal errors

- `unhandledRejection`: Promise без обработчика. В Node 26 по умолчанию фатально.
- `uncaughtException`: исключение вне Promise; состояние процесса неопределено.
- После fatal error нельзя продолжать обслуживать запросы. Нужно:
  1. записать sanitized сообщение;
  2. инициировать shutdown;
  3. выставить `process.exitCode = 1`;
  4. не вызывать `process.exit()` в середине работы (дать shutdown шанс).
- Логи не должны содержать `Authorization`, bearer/JWT, query secrets, URL userinfo.
- В тестах использовать fake EventEmitter, а не ронять реальный процесс.

### Signals в Node

```ts
process.once('SIGTERM', () => void coordinator.shutdown('SIGTERM'));
process.once('SIGINT', () => void coordinator.shutdown('SIGINT'));
```

`once` предотвращает лавину вызовов; идемпотентность всё равно нужна на уровне
координатора. На Windows SIGTERM/SIGINT ведут себя иначе — интеграционные сценарии
проверяйте на целевой платформе.

## Файлы модуля

```text
src/exercises/04-config-lifecycle/04-01.ts ... 04-04.ts
solutions/04-config-lifecycle/*.solution.ts
test/exercises/04-config-lifecycle/*.test.ts
```

## Упражнения

### 04-01. Zod env

```ts
loadConfig(env: NodeJS.ProcessEnv): AppConfig
```

- обязательные URL и непустой список Kafka brokers;
- defaults для NODE_ENV/HOST/PORT/LOG_LEVEL/лимитов;
- числа из строк, диапазоны;
- `ConfigError` с путями полей, без значений секретов;
- frozen config.

**Проверки:** defaults, overrides, отсутствующие/невалидные поля, пустые brokers, утечка
секрета, freeze.
**Ловушка:** `Number('') === 0`; `if (!process.env.PORT)`.

### 04-02. Precedence

```ts
resolveSettings(
  defaults: ServerSettings,
  file: FileSettings | undefined,
  env: NodeJS.ProcessEnv,
): ServerSettings
```

- env > file > defaults;
- `undefined` в файле не затирает default;
- host/port/logLevel валидируются;
- входы не мутируются, выход frozen.

**Проверки:** пустые источники, приоритет, undefined, ошибки, immutability.
**Ловушка:** spread с `undefined`.

### 04-03. Shutdown coordinator

```ts
class ShutdownCoordinator {
  constructor(tasks: readonly ShutdownTask[], options: { timeoutMs: number; logger? });
  get state(): 'running' | 'shutting-down' | 'stopped';
  shutdown(reason: string): Promise<ShutdownReport>;
}
```

- задачи закрываются в порядке регистрации;
- повторный вызов возвращает тот же Promise;
- ошибка задачи не мешает следующим;
- timeout абортит signal, фиксирует timedOut, не зависает;
- поздние reject-ы не становятся unhandled.

**Проверки:** порядок, идемпотентность, failure, hung task, никогда не завершающаяся
задача, невалидный timeout.
**Ловушка:** `process.exit()` сразу; `Promise.all` без таймаута.

### 04-04. Process guards

```ts
installProcessGuards(options: {
  onFatal(event): void;
  logger?(event): void;
  emitter?: ProcessGuardEmitter;
}): () => void

sanitizeErrorMessage(message: string): string
```

- первый fatal event → sanitized log, exitCode=1, onFatal;
- повторные fatal events игнорируются;
- logger/onFatal не должны ломать путь;
- bearer, password/token/secret, URL userinfo редактируются;
- uninstall снимает listeners.

**Проверки:** fake emitter, редактирование, один вызов, ошибки logger/onFatal, uninstall.
**Ловушка:** логировать raw error/request; продолжать работу после uncaughtException.

## Мини-проект

`loadConfig` + `ShutdownCoordinator` + `installProcessGuards` — каркас `src/index.ts`
будущего Ledger API. Порядок закрытия: HTTP server → Kafka consumer/producer → Redis → PG
pool. Каждый ресурс получает AbortSignal и укладывается в общий timeout.

## Команды

```bash
npm run test:exercises -- --test-name-pattern="04-"
npm run verify:solutions -- --module=04 --test-name-pattern="04-"
npm run typecheck
npm run lint
```

## Checklist

- [ ] Валидирую env Zod-схемой и падаю на старте.
- [ ] Не логирую секреты из env/URL/tokens.
- [ ] Понимаю precedence и разницу `undefined`/`''`.
- [ ] Shutdown идемпотентен, упорядочен и ограничен timeout.
- [ ] После uncaughtException не продолжаю обслуживание.
- [ ] Тестирую lifecycle на fakes, не роняя test runner.

## Quiz

1. Почему `process.env.PORT` нельзя использовать как number?
2. Чем опасен `{...defaults, ...file}` при `exactOptionalPropertyTypes`?
3. Почему второй SIGTERM не должен запускать второй shutdown?
4. Что делать, если `server.close()` не завершается?
5. Почему `process.exit()` в обработчике SIGTERM — плохая идея?
6. Какие данные нельзя писать в fatal log?

<details><summary>Ответы</summary>

1. Это всегда строка или undefined; нужна явная валидация/конверсия.
2. Явный `undefined` затрёт default; нужно проверять `!== undefined`.
3. Это может прервать корректное закрытие и создать гонки.
4. Абортить signal, закрыть оставшиеся ресурсы, выйти по таймауту с кодом ошибки.
5. Он не даёт shutdown завершиться и закрыть соединения/буферы.
6. Токены, Authorization, пароли, URL userinfo, PII, полные тела запросов.

</details>

## Cheat sheet

```ts
const config = envSchema.parse(process.env);
process.once('SIGTERM', () => void shutdown('SIGTERM'));
try {
  await server.close();
} finally {
  await pool.end();
}
process.exitCode = 1;
```

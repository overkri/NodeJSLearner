# Модуль 01. Async runtime

**Время:** 4 ч. **Предварительные требования:** модуль 00, базовое понимание Promise.
**Веха:** CPU-bound задача выполняется в worker pool, не блокируя HTTP event loop.

## Цель

Понять, что именно делает Node асинхронным: event loop, libuv, microtask-очереди и
`worker_threads`. Научиться ограничивать параллелизм, отменять операции и не терять ошибки.

## Теория

### Один JS thread, но не один ресурс

V8 исполняет JavaScript в одном основном потоке. `libuv` предоставляет pool (по умолчанию
4 потока) для файловых операций, DNS, crypto и некоторых системных вызовов. Сетевой I/O
обычно обслуживается epoll/kqueue/IOCP без отдельного потока на соединение.

Следствия:

- `await readFile(...)` не блокирует event loop: работу выполняет libuv pool.
- тяжёлый `for`/JSON/крипто-цикл в JS блокирует всё: таймеры, HTTP, другие Promise;
- `Promise` — это абстракция над очередью, а не поток. `Promise.all` не создаёт параллелизм
  для CPU-кода;
- для CPU-bound задач нужен `worker_threads` (свой isolate) или отдельный процесс.

### Event loop фазы

Упрощённо: timers → pending callbacks → poll (I/O) → check (`setImmediate`) → close.
Между фазами и после каждого callback дренируются microtask-очереди. В Node есть две:
`process.nextTick` и Promise/`queueMicrotask`.

Важная деталь Node 26: в **ESM** Promise microtasks выполняются раньше `process.nextTick`
(в CommonJS — наоборот). Официальный пример:

```js
Promise.resolve().then(() => console.log('resolve'));
queueMicrotask(() => console.log('microtask'));
process.nextTick(() => console.log('nextTick'));
// ESM:     resolve, microtask, nextTick
// CommonJS: nextTick, resolve, microtask
```

Не полагайтесь на относительный порядок `setTimeout(0)` и `setImmediate` из main module:
он зависит от контекста. Если порядок важен, стройте фазы явно (`await` таймера, затем
`await` immediate).

### Ограничение параллелизма

`items.map(async (item) => fetch(item))` запускает все запросы сразу: можно получить
rate limit, исчерпать pool или память. Нужен worker-pattern:

```ts
let next = 0;
async function worker() {
  while (next < items.length) {
    const index = next++;
    results[index] = await mapper(items[index]);
  }
}
await Promise.all(Array.from({ length: limit }, worker));
```

Результаты складываются по индексу, поэтому порядок сохраняется. При ошибке новые задачи
не стартуют; уже запущенные должны корректно завершиться.

### AbortSignal

`AbortController` — стандартный механизм отмены. Он не «убивает» Promise: операция должна
подписаться на `signal` и прекратить работу. Для таймаутов:

- создайте внутренний `AbortController`;
- по таймеру вызовите `abort()`;
- очистите таймер и listeners в `finally`/cleanup;
- подпишитесь на Promise операции даже после таймаута, чтобы поздний reject не стал
  unhandled rejection.

### worker_threads

```ts
const worker = new Worker(new URL('./task.worker.ts', import.meta.url));
worker.postMessage(typedArray, [typedArray.buffer]); // transfer
worker.once('message', (result) => {
  /* ... */
});
```

- каждый worker имеет свой event loop и память; объекты клонируются (structured clone);
- `ArrayBuffer` можно передать без копирования, но после transfer он detached;
- worker нужно завершать (`terminate`, `close`) и обрабатывать `error`/`exit`;
- пул worker-ов стоит переиспользовать; создание на каждый запрос дорого.

### Ошибки

- Отклонённый Promise без обработчика → `unhandledRejection`; в Node 26 по умолчанию это
  фатально. Обрабатывайте или явно логируйте.
- Исключение в `setTimeout`/event handler → `uncaughtException`; процесс в неопределённом
  состоянии, продолжать работу нельзя.
- Не бросайте строки: нормализуйте в `Error`.
- `Promise.race` без cleanup оставляет таймеры/listeners; всегда очищайте ресурсы.

## Файлы модуля

```text
src/exercises/01-async-runtime/01-01.ts ... 01-04.ts
src/exercises/01-async-runtime/01-03.worker.ts
solutions/01-async-runtime/*.solution.ts
test/exercises/01-async-runtime/*.test.ts
```

## Упражнения

### 01-01. Порядок event loop

```ts
runOrderingDemo(): Promise<readonly string[]>
```

Записать порядок: sync → Promise microtasks/queueMicrotask → nextTick (ESM) → timer →
immediate. Вернуть массив, детерминированный для Node 26 ESM.

**Проверки:** точная последовательность; два параллельных вызова не смешивают массивы.
**Ловушка:** `setTimeout(0)` vs `setImmediate` из main module непортируем.

### 01-02. Bounded concurrency

```ts
mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
  options?: { signal?: AbortSignal },
): Promise<R[]>
```

- не более `limit` одновременных вызовов;
- порядок результатов = порядок входа; каждый элемент обрабатывается один раз;
- `limit` — целое ≥ 1; пустой вход → `[]`;
- ошибка mapper-а прекращает запуск новых задач, in-flight завершаются;
- abort прекращает запуск и даёт `AbortOperationError`.

**Проверки:** счётчик active/max, порядок, reject, abort, уже aborted signal.
**Ловушка:** `Promise.all(items.map(...))` не ограничивает параллелизм.

### 01-03. worker_threads

```ts
sumInWorker(values: readonly bigint[]): Promise<bigint>
```

Сумма `bigint` в отдельном worker, передача через `BigInt64Array` с transfer. Пустой
вход → `0n`, worker закрывается на успехе и ошибке.

**Проверки:** обычная/пустая/отрицательная сумма, 100k элементов, два параллельных вызова.
**Ловушка:** sum в Promise всё равно блокирует main thread.

### 01-04. Таймауты и ошибки

```ts
withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  options?: { signal?: AbortSignal },
): Promise<T>
toError(value: unknown): Error
```

- таймаут → `TimeoutError`, signal операции aborted;
- внешняя отмена → `OperationCancelledError`;
- быстрый успех/ошибка очищают таймер; позднее завершение игнорируется;
- `timeoutMs` — конечное число ≥ 0; не-Error нормализуется.

**Проверки:** fast path, timeout, внешняя отмена, уже aborted, поздний reject, аргументы.
**Ловушка:** `Promise.race` без очистки таймера и обработки проигравшего Promise.

## Мини-проект: CPU task в worker pool

`sumInWorker` — модель будущего importer/report worker-а. В Ledger API такие задачи нельзя
делать в request path: HTTP handler должен отдать `202 Accepted`, а результат — через
очередь/статус. Worker pool ограничивается по размеру и закрывается при shutdown.

## Команды

```bash
npm run test:exercises -- --test-name-pattern="01-"
npm run verify:solutions -- --module=01 --test-name-pattern="01-"
npm run typecheck
npm run lint
```

## Checklist

- [ ] Объясняю, почему Promise не создаёт поток.
- [ ] Знаю, какие операции выполняет libuv pool, а какие блокируют main thread.
- [ ] Различаю `process.nextTick`, Promise microtasks, timers, `setImmediate`.
- [ ] Умею ограничить параллелизм без `Promise.all` по всем элементам.
- [ ] Отмена идёт через `AbortSignal`; таймеры/listeners очищаются.
- [ ] Обрабатываю поздние reject и `worker.on('error')`.
- [ ] Не использую worker_threads для обычного I/O.

## Quiz

1. Почему `await` внутри CPU-цикла не спасает event loop?
2. Чем `process.nextTick` отличается от `queueMicrotask` в ESM Node 26?
3. Почему `Promise.race([task, timeout])` недостаточен для таймаута?
4. Что произойдёт с `ArrayBuffer` после transfer в worker?
5. Как ограничить 100 HTTP-запросов до 5 одновременных?
6. Чем `unhandledRejection` опасен в Node 26?

<details><summary>Ответы</summary>

1. `await` уступает управление только на microtask checkpoint; синхронный цикл всё равно
   занимает main thread.
2. В ESM Promise microtasks идут раньше nextTick; в CJS — nextTick раньше.
3. Таймер остаётся, listeners не снимаются, поздний reject может стать unhandled.
4. Буфер становится detached; доступ к нему в отправляющем потоке невозможен.
5. Worker-pattern с общим индексом и N воркерами; либо очередь с backpressure.
6. По умолчанию процесс завершается; ошибка может остаться незамеченной до этого.

</details>

## Cheat sheet

```ts
const controller = new AbortController();
controller.abort();

const worker = new Worker(new URL('./task.worker.ts', import.meta.url));
worker.postMessage(buffer, [buffer.buffer]);

await Promise.all(Array.from({ length: limit }, () => workerLoop()));
```

# Модуль 03. Raw HTTP

**Время:** 4 ч. **Предварительные требования:** модули 00–02.
**Веха:** API на чистом `node:http`: router, middleware, body limit, error envelope.

## Цель

Увидеть HTTP lifecycle без фреймворка: сокет → `IncomingMessage` → routing → middleware →
handler → `ServerResponse` → ошибки. Это понимание понадобится, когда Nest скроет часть
деталей.

## Теория

### `node:http`

```ts
const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
});
server.listen(3000);
```

- `IncomingMessage` — Readable с headers/method/url; тело не читается автоматически.
- `ServerResponse` — Writable; headers отправляются при первом write/end.
- Node не ждёт async handler: `createServer(async (req,res) => ...)` не обработает reject.
  Нужно ловить ошибки внутри и не допускать unhandled rejection.
- `req.url` — path + query, не абсолютный URL. Парсите через `new URL(req.url, base)`.
- `Content-Length` может отсутствовать/лгать; лимит считайте по фактическим байтам.

### Router

Минимальный router:

- методы + шаблоны `/accounts/:id/entries`;
- сегменты, URL-decoding параметров;
- нормализация trailing slash;
- 404 vs 405 (+ `Allow`);
- registration order задаёт приоритет; duplicate routes запрещены.

В production берите проверенный router/framework. В курсе свой router нужен, чтобы увидеть
механику.

### Middleware

Onion-модель:

```ts
async function middleware(ctx, next) {
  // before
  await next();
  // after (reverse order)
}
```

- middleware может короткозамкнуть цепочку, не вызывая `next`;
- `next()` дважды — ошибка проектирования;
- ошибки всплывают к внешнему middleware;
- порядок регистрации критичен.

В Nest middleware/interceptors/guards — разные этапы; не смешивайте их.

### Тело запроса и лимиты

- Читайте поток порциями, считайте **байты**.
- При превышении лимита прекращайте чтение и отвечайте 413; не буферизуйте остаток.
- JSON парсите только после полного чтения; `JSON.parse` кидает `SyntaxError`.
- Схему проверяйте отдельно (Zod, модуль 07): `JSON.parse` не валидирует контракт.
- `Content-Type` проверяйте, если endpoint принимает только JSON.

### Ошибки и envelope

Единый формат:

```json
{ "error": { "code": "NOT_FOUND", "message": "Route not found", "requestId": "..." } }
```

- известные ошибки (`HttpError`, body errors) → status/code;
- неизвестные → 500 `INTERNAL_ERROR`, без stack/message наружу;
- если headers уже отправлены, вторую ошибку писать нельзя — destroy connection;
- request id принимайте только в безопасном формате, иначе генерируйте UUID.

### Request lifecycle

1. Создать request id, ответить им в заголовке.
2. Распарсить URL, найти route.
3. Создать контекст (params, state, AbortSignal).
4. Пройти middleware.
5. Вызвать handler; прочитать/валидировать тело.
6. Сериализовать ответ; при ошибке — envelope.
7. При закрытии клиента — abort signal, чтобы остановить работу.

## Файлы модуля

```text
src/exercises/03-raw-http/03-01.ts ... 03-04.ts
solutions/03-raw-http/*.solution.ts
test/exercises/03-raw-http/*.test.ts
```

## Упражнения

### 03-01. Router

```ts
class Router<THandler> {
  add(method: HttpMethod, pattern: string, handler: THandler): this;
  match(method: HttpMethod, pathname: string): RouteMatch<THandler> | null;
  allowedMethods(pathname: string): readonly HttpMethod[];
}
```

- `:param` в сегменте; decoded параметры;
- trailing slash; первый зарегистрированный route выигрывает;
- duplicate shape (`/a/:id` и `/a/:other`) запрещён;
- невалидный percent-encoding → нет match.

**Проверки:** static/param, decode, 405-набор, дубликаты, порядок.
**Ловушка:** сравнивать сырые URL; путать `/a/:id` и `/a/:other`.

### 03-02. Middleware composition

```ts
composeMiddleware<TContext>(
  middlewares: readonly Middleware<TContext>[],
): (context: TContext, terminal?: Next) => Promise<void>
```

- порядок before/after; short-circuit; ошибки; `next()` дважды → reject.

**Проверки:** onion order, terminal не вызван при short-circuit, catch, double next.
**Ловушка:** `next()` без `await`.

### 03-03. Bounded JSON body

```ts
readJsonBody(
  stream: Readable,
  options?: { maxBytes?: number; signal?: AbortSignal },
): Promise<unknown>
```

- лимит по байтам; пустое тело → `undefined`;
- превышение → `PayloadTooLargeError` (413);
- битый JSON → `InvalidJsonError` (400);
- abort → `AbortError`.

**Проверки:** split-чанки, лимит, пустое тело, malformed JSON, abort, аргументы.
**Ловушка:** `Content-Length`; string length вместо bytes.

### 03-04. HTTP server

```ts
createHttpServer(router: Router<HttpHandler>, options?): Server
sendJson(response, statusCode, body, headers?): void
class HttpError extends Error { statusCode; code; details }
```

- dispatch + middleware + 404/405;
- request id (safe header или UUID);
- mapping body/HttpError/unknown;
- content-type/content-length;
- AbortSignal при закрытии соединения.

**Проверки:** health/params/query, 404/405, 403, 500 без утечки, 413, 400, headers.
**Ловушка:** unhandled rejection в async handler; двойная запись ответа.

## Мини-проект: Ledger HTTP skeleton

`createHttpServer` — основа `src/transport` будущего Ledger API. В модулях 05–09 к нему
добавятся PostgreSQL, идемпотентность, JWT, логи и метрики. Доменный слой останется
независимым от `node:http`.

Ручная проверка:

```bash
npm run test:exercises -- --test-name-pattern="03-"
npm run verify:solutions -- --module=03 --test-name-pattern="03-"
```

## Checklist

- [ ] Объясняю, почему `createServer(async ...)` опасен.
- [ ] Читаю тело только с лимитом и по байтам.
- [ ] Различаю 404 и 405; отдаю `Allow`.
- [ ] Не раскрываю stack/message в 500.
- [ ] Очищаю listeners и обрабатываю закрытие клиента.
- [ ] Понимаю, чем middleware отличается от Nest guard/interceptor.

## Quiz

1. Что произойдёт с rejected Promise в async `createServer` callback?
2. Почему нельзя доверять `Content-Length`?
3. Чем 405 отличается от 404?
4. Зачем `AbortSignal` в HTTP handler?
5. Что делать, если ошибка возникла после `res.writeHead`?
6. Почему `next()` нужно `await`?

<details><summary>Ответы</summary>

1. Node не обработает: возможен unhandled rejection/падение процесса.
2. Он может отсутствовать, быть меньше фактического тела или лгать при chunked encoding.
3. 405 — путь существует, метод нет; нужен `Allow`. 404 — путь не найден.
4. Чтобы остановить чтение/БД/внешние вызовы при disconnect клиента.
5. Не писать второй ответ; destroyed connection/логирование.
6. Иначе ошибки и порядок after-фазы теряются.

</details>

## Cheat sheet

```ts
const url = new URL(req.url ?? '/', 'http://localhost');
req.on('data', (chunk) => {
  /* byte limit */
});
res.writeHead(200, { 'content-type': 'application/json' });
res.end(JSON.stringify(body));
await pipeline(req, transform, res);
```

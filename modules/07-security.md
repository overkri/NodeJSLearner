# Модуль 07. Security

**Время:** 4 ч. **Предварительные требования:** модули 03–06.
**Веха:** защищённые endpoints: Zod, headers, JWT, authorization, Bearer boundary.

## Цель

Закрыть HTTP-границу: валидировать вход, отдавать безопасные заголовки, проверять JWT
библиотекой и отделять authentication от authorization.

## Теория

### Валидация как security boundary

- Всё внешнее — `unknown`: тело, query, headers, env, Kafka.
- Zod-схема — единственный runtime-контракт; TypeScript-типы стираются.
- `.strict()` не даёт протащить лишние поля (`admin: true`).
- Ошибки перечисляют **пути** полей, но не значения: значения могут содержать секреты/PII.
- Деньги парсятся в `bigint` до бизнес-логики; `Number` и float запрещены.
- Лимит тела и размера полей — часть валидации, не только UX.

### Security headers для JSON API

Базовая линия:

```text
x-content-type-options: nosniff
x-frame-options: DENY
content-security-policy: default-src 'none'; frame-ancestors 'none'
referrer-policy: no-referrer
permissions-policy: camera=(), microphone=(), geolocation=()
cross-origin-opener-policy: same-origin
cross-origin-resource-policy: same-origin
cache-control: no-store
```

- HSTS (`strict-transport-security`) — только за HTTPS, иначе можно сломать dev.
- Удаляйте `x-powered-by`/`server`, не раскрывайте стек.
- CSP для API не должен разрешать scripts/styles; frontend — отдельный origin.
- CORS настраивается явно для известных origins; не `*` с credentials.

### JWT

- Подпись проверяется библиотекой (`jose`), не самописной криптографией.
- Проверяйте `iss`, `aud`, `exp`/`nbf`, алгоритм (allowlist).
- `alg: none` и algorithm confusion — классические атаки.
- `sub` обязателен; `scope`/`roles` — в массив.
- Токен не логируется; ошибка наружу — generic 401.
- Key rotation: JWKS с `kid`; в курсе локальный ключ, но API тот же.

### Authentication vs authorization

- 401 — не аутентифицирован (нет/битый токен).
- 403 — аутентифицирован, но нет прав.
- Владение ресурсом проверяется по `sub`, а не по `customerId` из body.
- Admin scope — явное исключение, не «если нет владельца».
- Политика — чистые функции/guard, независимые от HTTP.

### Bearer boundary

```text
Authorization: Bearer <token>
```

- Ровно один заголовок, схема case-insensitive, один пробел.
- Токен ограничен по длине; пробелы/переводы строк запрещены.
- Валидируйте до вызова verifier; ошибки не должны раскрывать токен.

### Прочее

- Rate limit (модуль 06) — часть security, но не замена авторизации.
- Секреты — только env/secret manager; не в коде, логах, Git.
- Зависимости фиксируются lock-файлом; `npm audit` — регулярно.
- SQL-инъекции предотвращаются параметрами (`$1`), не конкатенацией.

## Файлы модуля

```text
src/exercises/07-security/07-01.ts ... 07-05.ts
solutions/07-security/*.solution.ts
test/exercises/07-security/*.test.ts
```

## Упражнения

### 07-01. Zod transfer body

```ts
parseCreateTransfer(body: unknown): CreateTransferInput
```

- UUID from/to, разные; currency enum; amount decimal ≤2 знака, >0;
- вернуть `amountMinor: bigint`; unknown keys запрещены;
- `RequestValidationError` 400 с путями, без значений.

**Проверки:** minor units, invalid UUID/amount, same accounts, zero, unknown keys, no leak.
**Ловушка:** `as Dto`; `Number(amount)`.

### 07-02. Security headers

```ts
applySecurityHeaders(headers: ResponseHeaders, options?: { hsts?: boolean }): void
```

- nosniff, DENY, CSP, no-referrer, permissions, COOP/CORP, no-store;
- HSTS только по флагу; удалить x-powered-by/server; идемпотентность.

**Проверки:** значения, HSTS conditional, removal, idempotency.
**Ловушка:** HSTS в HTTP dev; `x-powered-by`.

### 07-03. JWT verifier

```ts
createJwtVerifier(options: {
  issuer; audience; key; algorithms?;
}): TokenVerifier
```

- signature/iss/aud/exp; sub → subject; scope string/array → scopes;
- любая ошибка → `TokenVerificationError` (401), без деталей jose.

**Проверки:** valid, scope forms, wrong iss/aud/exp/signature, missing sub, malformed, no leak.
**Ловушка:** `jwt.decode`; отсутствие `aud`/`algorithms`.

### 07-04. Authorization policy

```ts
hasScope(principal, scope): boolean
authorizeAccountRead(principal, account): void
authorizeTransfer(principal, source): void
```

- read → `accounts:read`; transfer → `transfers:write`;
- владелец = `principal.subject === account.customerId`;
- `ledger:admin` обходит проверки; 403 без ids.

**Проверки:** owner, missing scope, wrong owner, admin, no leak.
**Ловушка:** доверять customerId из body; 401 вместо 403.

### 07-05. Bearer boundary

```ts
extractBearerToken(header): string
authenticate(header, verifier): Promise<Principal>
```

- строгий формат, один заголовок, длина ≤4096;
- verifier errors → generic 401; token не попадает в сообщение.

**Проверки:** valid/lowercase, malformed variants, verifier failure, no call on bad header.
**Ловушка:** `Basic`; loose split; echo token.

## Мини-проект

Порядок на `POST /transfers`:

1. rate limit;
2. Bearer extraction + JWT verify;
3. Zod body;
4. authorization по source account;
5. idempotency coordinator;
6. transfer transaction.

Security headers добавляются middleware до handler. Ошибки — единый envelope из модуля 03.

## Команды

```bash
npm run test:exercises -- --test-name-pattern="07-"
npm run verify:solutions -- --module=07 --test-name-pattern="07-"
npm run typecheck
npm run lint
```

## Checklist

- [ ] Валидирую всё внешнее Zod-схемой.
- [ ] Не возвращаю значения полей в ошибках валидации.
- [ ] HSTS только HTTPS; удаляю fingerprint headers.
- [ ] Проверяю подпись, iss, aud, exp и алгоритм JWT.
- [ ] Различаю 401 и 403; проверяю владение по `sub`.
- [ ] Не логирую Authorization/токены.
- [ ] Bearer-заголовок строгий и ограничен по длине.

## Quiz

1. Почему TypeScript-интерфейс не валидирует JSON?
2. Чем 401 отличается от 403?
3. Почему `jwt.decode` без verify опасен?
4. Зачем allowlist алгоритмов?
5. Почему HSTS нельзя отправлять по HTTP?
6. Где проверять владение аккаунтом — в body или по токену?

<details><summary>Ответы</summary>

1. Типы исчезают после компиляции; runtime-значение может быть любым.
2. 401 — нет валидной аутентификации; 403 — аутентифицирован, но нет прав.
3. Он не проверяет подпись/claims; токен можно подделать.
4. Предотвращает algorithm confusion и `alg: none`.
5. Браузер запомнит HSTS для домена и будет требовать HTTPS даже в dev.
6. По `sub` из проверенного токена; body можно подменить.

</details>

## Cheat sheet

```ts
const schema = z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/) }).strict();
const { payload } = await jwtVerify(token, key, { issuer, audience, algorithms: ['RS256'] });
if (principal.subject !== account.customerId) throw new AuthorizationError();
```

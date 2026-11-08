# Модуль 06. Redis и идемпотентность

**Время:** 3 ч. **Предварительные требования:** модули 04–05.
**Веха:** повтор с `Idempotency-Key` не дублирует перевод; Redis TTL и atomic claim.

## Цель

Использовать Redis как ускоритель и координатор, не как источник истины. Понять TTL,
атомарные операции, distributed lock и границы идемпотентности.

## Теория

### Роль Redis

- кэш ответов и hot data;
- TTL-ключи (idempotency fast path, rate limit);
- distributed lock / atomic claim;
- счётчики и координация.

Redis **не** заменяет PostgreSQL:

- потеря Redis не должна терять деньги;
- финальная гарантия идемпотентности — уникальный ключ/транзакция в PostgreSQL;
- кэш можно инвалидировать/потерять в любой момент.

### node-redis

```ts
const client = createClient({ url: process.env.REDIS_URL });
client.on('error', (error) => logger.error({ error }));
await client.connect();
// ...
await client.quit();
```

- один клиент на процесс (или пул, если нужен); не создавайте client на запрос;
- `isOpen` перед `quit`;
- ошибки `'error'` нужно слушать, иначе uncaught;
- команды асинхронные; pipeline/multi — для батчей.

### TTL

- TTL обязателен для кэшей/locks: иначе мусор и утечка памяти;
- `SET key value EX seconds` или `PX ms`;
- `SET ... NX` — atomic «только если нет»;
- `TTL`/`PTTL` возвращают оставшееся время; `-1` — без expiry, `-2` — нет ключа.

### Atomic lock

```text
SET lock:v1:transfer:42 <token> NX PX 5000
```

- true только если ключ создан этим клиентом;
- release: Lua `GET == token` then `DEL` — иначе можно удалить чужой lock после TTL;
- TTL должен быть больше максимальной длительности операции;
- при потере lock операция может продолжиться — идемпотентность/БД должны защитить.

### Идемпотентность

Сценарий `POST /transfers` с `Idempotency-Key`:

1. Cache lookup: replay → вернуть сохранённый ответ; conflict → 409.
2. Atomic lock по ключу; не взяли → 409/429 `IDEMPOTENCY_IN_PROGRESS`.
3. Повторный cache lookup (другой запрос мог завершиться).
4. Durable store в PostgreSQL: unique key + request hash + response, в одной транзакции
   с transfer/ledger/outbox.
5. Cache put best-effort; ошибки Redis не ломают успешный перевод.
6. Release lock в `finally`; ошибка release не маскирует результат.

Request hash считается по каноническому payload (from, to, amount, currency). Тот же ключ
с другим hash → 409. TTL записи — `IDEMPOTENCY_TTL_SECONDS`.

### Rate limit

`INCR` + `EXPIRE` должны быть атомарны (Lua), иначе ключ может остаться без TTL.
Fixed window прост, но даёт burst на границе окна; sliding window/token bucket — следующий
шаг.

### Ошибки Redis

- cache get/put — best-effort: деградация к PostgreSQL;
- lock acquire — критичен: без lock можно выполнить операцию дважды, поэтому лучше
  отклонить запрос;
- release — best-effort; TTL страхует;
- не логируйте значения ключей с PII/секретами.

## Файлы модуля

```text
src/exercises/06-redis-idempotency/06-01.ts ... 06-04.ts
solutions/06-redis-idempotency/*.solution.ts
test/exercises/06-redis-idempotency/*.test.ts
src/infrastructure/redis/client.ts
```

## Упражнения

### 06-01. Atomic lock

```ts
lockKey(resource): string
acquireLock(redis, resource, token, ttlMs): Promise<boolean>
releaseLock(redis, resource, token): Promise<boolean>
```

- prefix `lock:v1:`; SET NX PX; true только для `OK`;
- release через compare-and-delete Lua; false при чужом/истёкшем токене;
- валидация token/ttl.

**Проверки:** OK/null, параметры SET, Lua script, stale token, validation.
**Ловушка:** GET+DEL не атомарен; release без проверки token.

### 06-02. Idempotency cache

```ts
class RedisIdempotencyCache {
  get(
    key,
    requestHash,
  ): Promise<{ status: 'miss' } | { status: 'replay'; response } | { status: 'conflict' }>;
  put(key, requestHash, response): Promise<void>;
}
```

- versioned JSON, TTL `EX ttlSeconds`, prefix `idem:cache:v1:`;
- corrupt/absent → miss (corrupt удаляется);
- falsy response сохраняется (`false`, `0`, `null`);
- другой hash → conflict.

**Проверки:** replay, conflict, corrupt, TTL, falsy, prefix, validation.
**Ловушка:** `if (!response)`; JSON без версии.

### 06-03. Coordinator

```ts
class IdempotencyCoordinator {
  execute<T>(key, requestHash, operation): Promise<{ value: T; replayed: boolean }>;
}
```

- cache replay/conflict short-circuit;
- lock contention → `IdempotencyInProgressError`;
- double-check cache после lock;
- durable store → cache best-effort → release lock в finally;
- cache/release ошибки не ломают успех; operation error не кэшируется.

**Проверки:** replay, conflict, success order, contention, double-check, failure, outages,
durable replay, TTL validation.
**Ловушка:** кэшировать до commit; release без finally.

### 06-04. Rate limit

```ts
checkRateLimit(redis, key, limit, windowSeconds): Promise<{
  allowed; limit; remaining; resetSeconds;
}>
```

- атомарный Lua INCR+EXPIRE+TTL;
- `remaining` не отрицательный; `resetSeconds` из TTL;
- malformed reply — ошибка; валидация аргументов.

**Проверки:** allow/deny, script, key prefix, validation, malformed.
**Ловушка:** два round-trip; доверять клиентскому счётчику.

## Мини-проект

`src/infrastructure/redis/client.ts` — connection lifecycle. В Ledger API coordinator
оборачивает `TransferService.transfer`, а durable store пишет `idempotency_records` в той
же транзакции, что transfer/ledger/outbox. Redis можно выключить: API останется корректным,
только медленнее.

## Команды

```bash
npm run test:exercises -- --test-name-pattern="06-"
npm run verify:solutions -- --module=06 --test-name-pattern="06-"
npm run typecheck
npm run lint
```

## Checklist

- [ ] У каждого кэша/lock есть TTL.
- [ ] SET NX PX и compare-and-delete атомарны.
- [ ] Redis не является source of truth для денег.
- [ ] Cache errors деградируют, lock errors — отклоняют.
- [ ] Повтор с тем же ключом возвращает replay, с другим payload — 409.
- [ ] Lock release в `finally`, token уникален.
- [ ] Rate limit не оставляет ключ без expiry.

## Quiz

1. Почему `GET` + `DEL` для lock опасен?
2. Что произойдёт, если Redis недоступен во время перевода?
3. Зачем double-check cache после lock?
4. Почему нельзя кэшировать ответ до commit?
5. Чем `EX` отличается от `PX`?
6. Почему TTL lock должен превышать длительность операции?

<details><summary>Ответы</summary>

1. Между GET и DEL TTL может истечь, и вы удалите lock другого владельца.
2. Кэш/lock деградируют; durable PostgreSQL-транзакция остаётся гарантией.
3. Другой запрос мог завершиться, пока вы ждали lock.
4. Транзакция может откатиться; кэш будет содержать несуществующий результат.
5. EX — секунды, PX — миллисекунды.
6. Иначе lock истечёт, пока операция ещё выполняется, и появится второй владелец.

</details>

## Cheat sheet

```ts
await redis.set(key, token, { NX: true, PX: 5000 });
await redis.eval(
  'if redis.call("get",KEYS[1])==ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end',
  { keys: [key], arguments: [token] },
);
await redis.set(k, v, { EX: 60 });
```

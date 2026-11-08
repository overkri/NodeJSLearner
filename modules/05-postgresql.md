# Модуль 05. PostgreSQL

**Время:** 5 ч. **Предварительные требования:** модули 00–04, SQL и транзакции известны.
**Веха:** атомарный перевод + две ledger entries; locks и миграции.

## Цель

Перейти от in-memory к PostgreSQL: pool, явные транзакции, блокировки, батч-запросы,
Drizzle-схема и миграции. Домен не должен знать про `pg`/Drizzle.

## Теория

### Pool

`pg.Pool` — аналог HikariCP. Каждый `connect()` нужно вернуть:

```ts
const client = await pool.connect();
try {
  // query
} finally {
  client.release(); // или release(error) при сбое
}
```

- pool ограничен (`max`, по умолчанию 10); утечка client-а исчерпывает пул;
- `release(err)` уничтожает соединение, `release()` возвращает в пул;
- idle client errors нужно слушать, иначе `'error'` станет uncaught;
- `pool.end()` при shutdown.

### Транзакции

Нет proxy `@Transactional`. Границы видны:

```ts
BEGIN
  SELECT ... FOR UPDATE
  INSERT ...
COMMIT
-- при ошибке: ROLLBACK
```

- `BEGIN`/`COMMIT`/`ROLLBACK` — обычные query;
- при ошибке обязательно rollback и release;
- COMMIT failure — тоже повод rollback (best effort);
- вложенные транзакции не «присоединяются» автоматически; используйте savepoints
  осознанно;
- уровень изоляции по умолчанию `READ COMMITTED`; для денег достаточно явных locks.

### Блокировки и deadlock

Два перевода A→B и B→A без порядка могут заблокировать друг друга. Решение:

```sql
SELECT ... FROM accounts
WHERE id = ANY($1::uuid[])
ORDER BY id
FOR UPDATE;
```

- ids дедуплицируются и сортируются до запроса;
- одинаковый порядок во всех транзакциях;
- `FOR UPDATE` держит lock до COMMIT/ROLLBACK;
- missing rows нужно проверять: блокировка несуществующей строки не спасает.

### Деньги в PostgreSQL

- `bigint` (minor units), не `numeric` с float и не `double`;
- node-postgres возвращает `int8` как **string**; конвертируйте `BigInt(row.balance_minor)`;
- CHECK `amount_minor > 0`, `balance_minor >= 0`;
- валюта рядом с суммой; cross-currency переводы запрещены.

### Батчи и N+1

- Две ledger entries вставляются одним `INSERT ... UNNEST(...)`, не двумя round-trip;
- история по 100 аккаунтам — один `WHERE account_id = ANY($1)`, не 100 запросов;
- `Map` группирует строки; порядок внутри аккаунта сохраняется;
- EXPLAIN/ANALYZE — после появления реальных данных, не до.

### Drizzle и миграции

- Схема в `src/infrastructure/db/schema.ts` — типизированное описание таблиц;
- SQL-миграции в `migrations/` — source of truth для БД;
- `drizzle-kit generate` создаёт миграцию, `drizzle-kit migrate` применяет;
- схема и миграции должны совпадать; drift проверяется в CI/на ревью;
- partial index для outbox: `WHERE published_at IS NULL`.

### Границы слоёв

- `src/domain` — `Account`, `Money`, инварианты; без `pg`;
- `src/application/ports` — интерфейсы репозиториев и `TransactionContext`;
- `src/infrastructure/db` — SQL, Drizzle, pool;
- `TransactionContext` не должен протаскивать `PoolClient` в domain.

## Файлы модуля

```text
src/exercises/05-postgresql/05-01.ts ... 05-06.ts
solutions/05-postgresql/*.solution.ts
test/exercises/05-postgresql/*.test.ts
src/infrastructure/db/schema.ts
src/infrastructure/db/pool.ts
migrations/0001_init.sql, 0002_indexes.sql
drizzle.config.ts
```

## Упражнения

### 05-01. Pool ownership

```ts
withClient<TClient extends PoolClientLike, TResult>(
  pool: PoolLike<TClient>,
  operation: (client: TClient) => Promise<TResult>,
): Promise<TResult>
```

- release ровно один раз; `release(error)` при сбое; connect failure не release;
- release error после успеха пробрасывается, после ошибки — не маскирует её.

**Проверки:** success, failure, connect failure, release failure.
**Ловушка:** `client.release()` вне `finally`.

### 05-02. Transaction callback

```ts
runInTransaction<TResult>(
  pool: TransactionPool,
  work: (client: TransactionClient) => Promise<TResult>,
): Promise<TResult>
```

- BEGIN → work → COMMIT; ошибка → ROLLBACK (если BEGIN прошёл);
- release в finally; исходная ошибка приоритетнее rollback/release.

**Проверки:** SQL order, BEGIN/COMMIT failure, release failure, original error.
**Ловушка:** забыть release на COMMIT failure; rollback после неудачного BEGIN.

### 05-03. Transfer plan

```ts
planTransfer(
  accounts: { from: Account | null; to: Account | null },
  command: TransferCommand,
): TransferPlan
```

- аккаунты существуют, различны, active; валюта совпадает; сумма > 0; средств достаточно;
- balances after + две entries (debit/credit); входы не мутируются.

**Проверки:** успех, missing, same, frozen, currency, insufficient, exact balance.
**Ловушка:** проверять баланс после side effect; использовать number.

### 05-04. Lock ordering

```ts
lockAccountsInOrder(tx: Queryable, ids: readonly string[]): Promise<readonly Account[]>
```

- dedupe + sort ids; один SQL с `ANY($1::uuid[]) ORDER BY id FOR UPDATE`;
- маппинг `int8` string → bigint, timestamp → Date; пустой вход не ходит в БД.

**Проверки:** параметры, SQL, маппинг, пустой список, missing rows.
**Ловушка:** блокировать в порядке запроса — deadlock.

### 05-05. Batch insert ledger entries

```ts
insertLedgerEntries(tx: Queryable, entries: readonly LedgerEntryInsert[]): Promise<number>
```

- валидация до SQL; один `INSERT ... UNNEST(...)`;
- массивы параметров в порядке входа; пустой вход → 0 без запроса.

**Проверки:** один вызов, параметры, пустой вход, невалидные direction/amount.
**Ловушка:** N запросов в цикле; частичная запись.

### 05-06. N+1 batch loader

```ts
loadEntriesByAccount(
  accountIds: readonly string[],
  fetchBatch: BatchFetcher,
  options?: { batchSize?: number },
): Promise<ReadonlyMap<string, readonly EntryRecord[]>>
```

- dedupe, chunks, один вызов на chunk; Map содержит все запрошенные id;
- порядок строк сохраняется; пустой вход — без вызова.

**Проверки:** 250 id → 3 вызова, dedupe, пустые аккаунты, ошибка fetcher.
**Ловушка:** `for (id) await findByAccount(id)`.

## Мини-проект: Ledger persistence

- `migrations/0001_init.sql` — таблицы customers/accounts/transfers/ledger_entries/
  idempotency_records/outbox_events + CHECK constraints;
- `0002_indexes.sql` — индексы, включая partial outbox;
- `src/infrastructure/db/pool.ts` — pool и transaction wrapper;
- `src/infrastructure/db/schema.ts` — Drizzle-схема.

Порядок перевода: `withTransaction` → `lockAccountsInOrder` → `planTransfer` →
update balances → insert transfer + entries + outbox → COMMIT.

## Команды

```bash
npm run test:exercises -- --test-name-pattern="05-"
npm run verify:solutions -- --module=05 --test-name-pattern="05-"
npm run typecheck
npm run lint
npm run db:generate
npm run db:migrate   # требует DATABASE_URL и запущенный PostgreSQL
```

## Checklist

- [ ] Каждый client возвращается в pool в `finally`.
- [ ] Транзакция всегда завершается COMMIT или ROLLBACK.
- [ ] Locks берутся в стабильном порядке; missing rows проверяются.
- [ ] Деньги — bigint minor units; pg int8 конвертируется явно.
- [ ] Ledger entries пишутся батчем; N+1 отсутствует.
- [ ] Схема Drizzle и SQL-миграции согласованы.
- [ ] Domain/application не импортируют pg/Drizzle.

## Quiz

1. Что произойдёт, если не вызвать `client.release()`?
2. Почему `SELECT FOR UPDATE` без `ORDER BY` может дать deadlock?
3. Почему `balance_minor` из pg — строка?
4. Чем `INSERT ... UNNEST` лучше N отдельных INSERT?
5. Что такое N+1 и как его убрать в истории аккаунтов?
6. Зачем partial index для outbox?
7. Почему Drizzle-схема и SQL-миграции должны совпадать?

<details><summary>Ответы</summary>

1. Пул исчерпается; новые запросы зависнут/упадут по timeout.
2. Две транзакции захватят строки в разном порядке и будут ждать друг друга.
3. `int8` может не поместиться в JS number; pg отдаёт string для точности.
4. Один round-trip, меньше latency, запись одной командой.
5. Один запрос на аккаунт вместо одного на список; batch `WHERE id = ANY($1)`.
6. Индексирует только неопубликованные события, ускоряя poller и экономя место.
7. Иначе типы приложения и реальная БД разойдутся; drift ломает запросы и миграции.

</details>

## Cheat sheet

```ts
const client = await pool.connect();
try { await client.query('BEGIN'); /* ... */ await client.query('COMMIT'); }
catch (e) { await client.query('ROLLBACK'); throw e; }
finally { client.release(); }

SELECT ... WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE;
insert into ledger_entries ... select * from unnest($1::uuid[], ...);
```

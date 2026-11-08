# Модуль 09. Kafka и outbox

**Время:** 5 ч. **Предварительные требования:** модули 05–08.
**Веха:** outbox → Kafka → consumer с повторной доставкой; offsets и retry.

## Цель

Гарантировать доставку события без dual-write: PostgreSQL-транзакция пишет outbox,
отдельный publisher доставляет в Kafka, consumer идемпотентно обрабатывает повторы.

## Теория

### Dual-write problem

Нельзя делать:

```text
COMMIT transfer; await producer.send(event); // процесс упал между шагами
```

и нельзя отправлять до COMMIT (событие может быть про откатившийся перевод). Решение —
**transactional outbox**:

1. В одной транзакции: transfer + ledger entries + `outbox_events`.
2. Отдельный poller читает неопубликованные события.
3. Публикует в Kafka, помечает `published_at`.
4. При падении между publish и mark событие будет доставлено повторно — consumer обязан
   быть идемпотентным.

Kafka **не** source of truth; PostgreSQL — источник истины.

### Outbox таблица

- `id`, `aggregate_type`, `aggregate_id`, `event_type`, `payload jsonb`,
  `created_at`, `published_at`, `attempts`;
- partial index `WHERE published_at IS NULL`;
- claim батча: `FOR UPDATE SKIP LOCKED`, чтобы несколько publisher-ов не дублировали
  работу;
- attempts увеличивается при claim; после лимита — DLQ/алерт, но событие не теряется.

### Event envelope

- версия схемы (`schemaVersion`), `eventId`, тип, aggregate, `occurredAt`, payload;
- валидируется Zod и на producer, и на consumer;
- деньги — decimal string, не number;
- эволюция схемы: backward-compatible поля, consumer терпит неизвестные? В курсе strict
  для контроля; в production — schema registry.

### KafkaJS

```ts
const producer = kafka.producer();
await producer.connect();
await producer.send({ topic, messages: [{ key, value }] });
await producer.disconnect();
```

- `key` = aggregate id для партиционирования/порядка;
- producer retries не заменяют outbox;
- consumer group, subscribe, `eachMessage`;
- `autoCommit: false`: commit offset **после** успешной обработки;
- offset commit — следующий offset (`current + 1`), 64-bit строка → BigInt;
- при ошибке handler offset не коммитится; KafkaJS повторит;
- consumer должен быть идемпотентен по `eventId` (processed_events/уникальный индекс).

### Retry/backoff

- ограниченное число попыток, exponential backoff + jitter;
- не retry-ить невалидное событие бесконечно (poison pill → DLQ);
- retry на уровне outbox publisher и consumer — разные вещи;
- shutdown должен остановить poller/consumer и дождаться in-flight.

### At-least-once

Kafka даёт at-least-once; exactly-once в учебном проекте не обещается. Корректность
строится на идемпотентности consumer-а и уникальных constraints.

## Файлы модуля

```text
src/exercises/09-kafka-outbox/09-01.ts ... 09-06.ts
solutions/09-kafka-outbox/*.solution.ts
test/exercises/09-kafka-outbox/*.test.ts
src/infrastructure/kafka/client.ts
test/integration/kafka.test.ts (env-gated)
```

## Упражнения

### 09-01. Event envelope

```ts
parseEventEnvelope(input: unknown): EventEnvelope
```

- schemaVersion/eventType/aggregateType literals, UUID ids, ISO time, amount decimal;
- aggregateId = payload.transferId; unknown fields запрещены;
- ошибки с путями, без значений.

**Проверки:** valid, schema/type/id, money/time, unknown fields, no leak.
**Ловушка:** `JSON.parse as Event`; number для денег.

### 09-02. Outbox SQL

```ts
enqueueOutbox(tx, event): Promise<void>
claimOutboxBatch(tx, limit): Promise<OutboxEventRecord[]>
markOutboxPublished(tx, eventId): Promise<void>
```

- parameterized INSERT; claim `UPDATE ... SKIP LOCKED` + attempts+1;
- маппинг jsonb/date/attempts; limit 1..1000.

**Проверки:** SQL/params, claim mapping, limit, mark.
**Ловушка:** SELECT+UPDATE раздельно; публикация без mark.

### 09-03. Retry publisher

```ts
publishWithRetry(publisher, event, {
  maxAttempts?; baseDelayMs?; sleep?;
}): Promise<void>
```

- exponential delays, no sleep after last attempt; last error thrown;
- injectable sleep; validation; normalize non-Error.

**Проверки:** first success, retry success, final failure, delays, validation.
**Ловушка:** бесконечный retry; retry validation errors.

### 09-04. Idempotent consumer

```ts
handleEventOnce(store, event, handler): Promise<'processed' | 'duplicate'>
```

- duplicate → handler не вызывается;
- handler → markProcessed; handler error не маркирует;
- mark error пробрасывается.

**Проверки:** first/duplicate, handler failure, mark failure, empty id.
**Ловушка:** mark до handler; ack до side effect.

### 09-05. Offset commit

```ts
processKafkaMessage(message, handler, committer): Promise<{ status; error? }>
```

- handler success → commit offset+1; failure → retry, no commit;
- 64-bit offset через BigInt; commit failure пробрасывается.

**Проверки:** commit +1, retry, large offset, commit failure, metadata.
**Ловушка:** Number(offset); commit current offset.

### 09-06. Outbox poll tick

```ts
pollOutboxOnce(store, publisher, options): Promise<{ claimed; published; failed }>
```

- claim batch → publishWithRetry → markPublished;
- poison event не останавливает batch и не маркируется;
- batchSize validation.

**Проверки:** all success, partial failure, retry options, empty batch.
**Ловушка:** mark before publish; abort whole batch.

## Интеграционный тест

`test/integration/kafka.test.ts` (только при `RUN_INTEGRATION_TESTS=true`):

- создаёт уникальный topic/group;
- producer → consumer roundtrip;
- проверяет envelope;
- закрывает producer/consumer/admin в `finally`.

`src/infrastructure/kafka/client.ts` — KafkaJS producer/consumer с manual commit.

## Команды

```bash
npm run test:exercises -- --test-name-pattern="09-"
npm run verify:solutions -- --module=09 --test-name-pattern="09-"
RUN_INTEGRATION_TESTS=true npm run test:integration   # нужен Kafka
npm run typecheck
npm run lint
```

## Checklist

- [ ] Событие пишется в outbox в одной транзакции с переводом.
- [ ] Publisher использует SKIP LOCKED и attempts.
- [ ] Публикация и mark разделены; повторная доставка допустима.
- [ ] Consumer идемпотентен по eventId.
- [ ] Offset коммитится только после handler, offset+1, BigInt.
- [ ] Retry ограничен, poison event не блокирует batch.
- [ ] Shutdown останавливает poller/consumer.
- [ ] Kafka не считается source of truth.

## Quiz

1. Почему нельзя отправлять событие после COMMIT без outbox?
2. Зачем `FOR UPDATE SKIP LOCKED`?
3. Почему offset коммитится как current+1?
4. Что произойдёт при падении между publish и markPublished?
5. Почему consumer должен быть идемпотентным при at-least-once?
6. Когда событие отправлять в DLQ?

<details><summary>Ответы</summary>

1. Процесс может упасть между COMMIT и send; событие потеряется (dual-write).
2. Несколько publisher-ов не блокируют друг друга и не дублируют строки.
3. Kafka хранит offset следующего сообщения для группы.
4. Событие будет опубликовано повторно; consumer должен dedupe по eventId.
5. Повторная доставка неизбежна при retry/rebalance.
6. После исчерпания retry/при невалидной схеме; с алертом и возможностью replay.

</details>

## Cheat sheet

```sql
UPDATE outbox_events SET attempts = attempts + 1
WHERE id IN (SELECT id FROM outbox_events WHERE published_at IS NULL
             ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED)
RETURNING *;
```

```ts
await consumer.commitOffsets([{ topic, partition, offset: (BigInt(offset) + 1n).toString() }]);
```

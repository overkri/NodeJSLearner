# API: Ledger API

Базовый URL: `http://127.0.0.1:3000`. JSON, UTF-8. Деньги — decimal string, валюта — ISO 4217. Внутри — minor units `bigint`, float не используется.

## Аутентификация

`Authorization: Bearer <JWT>`. Токен проверяется `jose` по локальному ключу/JWKS из env.
Реальный Keycloak в курсе не поднимается.

## Endpoints

### POST /customers

```json
{ "email": "alice@example.com" }
```

`201 Created`

```json
{ "id": "uuid", "email": "alice@example.com", "createdAt": "2026-11-08T10:00:00.000Z" }
```

### POST /customers/:customerId/accounts

```json
{ "currency": "USD" }
```

`201 Created`

```json
{
  "id": "uuid",
  "customerId": "uuid",
  "currency": "USD",
  "status": "active",
  "balance": "0.00"
}
```

### GET /accounts/:accountId

`200 OK`

```json
{
  "id": "uuid",
  "customerId": "uuid",
  "currency": "USD",
  "status": "active",
  "balance": "10.50"
}
```

### GET /accounts/:accountId/entries?limit=50&cursor=...

`200 OK`

```json
{
  "items": [
    {
      "id": "uuid",
      "transferId": "uuid",
      "direction": "credit",
      "amount": "5.25",
      "currency": "USD",
      "createdAt": "2026-11-08T10:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

### POST /transfers

Заголовки:

```text
Authorization: Bearer <JWT>
Idempotency-Key: <8..128 chars>
Content-Type: application/json
```

```json
{
  "fromAccountId": "uuid",
  "toAccountId": "uuid",
  "amount": "10.50",
  "currency": "USD"
}
```

`201 Created`

```json
{
  "transferId": "uuid",
  "status": "completed",
  "fromAccountId": "uuid",
  "toAccountId": "uuid",
  "amount": "10.50",
  "currency": "USD",
  "replayed": false
}
```

Повтор с тем же ключом и тем же payload: `200 OK`, `"replayed": true`.
Тот же ключ с другим payload: `409 IDEMPOTENCY_CONFLICT`.

## Идемпотентность

- `Idempotency-Key` обязателен для `POST /transfers`.
- Хэш канонического payload (from, to, amount, currency) сравнивается с сохранённым.
- Redis — ускоритель и временная координация; PostgreSQL constraint/уникальный индекс —
  финальная гарантия.
- Запись `idempotency_records` и transfer/ledger/outbox создаются в одной транзакции.
- TTL задаётся `IDEMPOTENCY_TTL_SECONDS`.

## Конкурентные переводы

- В одной транзакции аккаунты читаются `SELECT ... FOR UPDATE` в стабильном порядке id.
- Проверяются статус, валюта и достаточность средств.
- Создаются transfer, две ledger entries (debit/credit) и outbox event.
- Rollback при любой ошибке; повторный consumer не дублирует эффект.

## Ошибки

Единый envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amount must be a positive decimal string",
    "requestId": "uuid"
  }
}
```

| HTTP | code                   | Когда                                    |
| ---: | ---------------------- | ---------------------------------------- |
|  400 | `VALIDATION_ERROR`     | Zod/JSON/заголовки                       |
|  401 | `UNAUTHORIZED`         | нет/невалиден токен                      |
|  403 | `FORBIDDEN`            | нет прав на аккаунт                      |
|  404 | `ACCOUNT_NOT_FOUND`    | аккаунт не найден                        |
|  409 | `IDEMPOTENCY_CONFLICT` | ключ использован с другим payload        |
|  409 | `INSUFFICIENT_FUNDS`   | недостаточно средств                     |
|  413 | `PAYLOAD_TOO_LARGE`    | превышен body limit                      |
|  422 | `CURRENCY_MISMATCH`    | валюты не совпадают                      |
|  429 | `RATE_LIMITED`         | превышен лимит                           |
|  500 | `INTERNAL_ERROR`       | непредвиденная ошибка без утечки деталей |

## Событие

Топик: `ledger.transfers.v1`. Envelope:

```json
{
  "eventId": "uuid",
  "eventType": "TransferCreated",
  "aggregateType": "transfer",
  "aggregateId": "uuid",
  "occurredAt": "2026-11-08T10:00:00.000Z",
  "payload": {
    "transferId": "uuid",
    "fromAccountId": "uuid",
    "toAccountId": "uuid",
    "amount": "10.50",
    "currency": "USD"
  }
}
```

Consumer идемпотентен по `eventId`; offset коммитится только после успешной обработки.
Ошибки ретраятся с ограниченным backoff; исчерпание попыток — в DLQ/лог, без потери
исходного события.

## Health

- `GET /health` — процесс жив.
- `GET /ready` — проверены PG/Redis/Kafka (или явно отмечены недоступными).
- `GET /metrics` — Prometheus; labels только `method`, `route`, `status_code`.

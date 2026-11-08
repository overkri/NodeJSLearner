# ADR 0001: деньги и границы транзакций

- Статус: принято
- Дата: 2026-11-08
- Контекст: учебный Ledger API; Java/Spring-инженер; PostgreSQL — source of truth.

## Решение

1. Деньги хранятся как целые minor units (`bigint` в домене и PostgreSQL `bigint`).
   В JSON — decimal string. Float/double запрещены.
2. Валюта хранится рядом с суммой. Операции между разными валютами отклоняются.
3. Границы транзакции задаются явно callback-функцией инфраструктуры; domain/application
   не импортируют `pg`/Drizzle.
4. Перевод выполняется в одной транзакции: блокировка аккаунтов `SELECT FOR UPDATE` в
   стабильном порядке id, проверка баланса, запись transfer + двух ledger entries +
   outbox event.
5. Идемпотентность: уникальный ключ + request hash в PostgreSQL; Redis используется как
   ускоритель/координация, но не как финальная гарантия.
6. Kafka не source of truth: событие попадает в outbox в той же транзакции, отдельный
   publisher доставляет его и помечает published.

## Последствия

- Нужны явные transaction context и repository ports.
- Возможны deadlock при разном порядке блокировок; порядок фиксируется по id.
- Consumer обязан быть идемпотентным по `eventId`.
- Деньги нельзя парсить через `Number`; нужен строгий decimal parser.
- Изменение контрактов (типы, семантика идемпотентности, event schema) требует нового ADR.

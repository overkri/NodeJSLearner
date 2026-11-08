# AUTHORING: правила генерации упражнений

Этот документ фиксирует механические соглашения курса. Содержательные требования — в
`plan.md` и `modules/NN-*.md`.

## Файлы одного упражнения

```text
src/exercises/<NN-module>/<NN-MM>.ts              starter + TODO
test/exercises/<NN-module>/<NN-MM>.test.ts        contract tests
solutions/<NN-module>/<NN-MM>.solution.ts         reference implementation
```

`solutions/<module>/` и `src/exercises/<module>/` находятся на одной глубине, поэтому
относительные импорты (`../../shared/...`) в starter и solution одинаковы. `verify:solutions`
копирует solution поверх starter.

## Starter

1. Импорт `NotImplementedError` из `../../shared/not-implemented.js`.
2. Шапка ровно по шаблону из `plan.md` (Topic, Java/Spring analogy, Requirements, Hints,
   Trap, Run tests).
3. Публичные типы и сигнатуры.
4. Тело — `throw new NotImplementedError('<function>')`; не вставлять решение.
5. Для неиспользуемых параметров — `void param;` (иначе lint).
6. Не импортировать solution и не ссылаться на тесты.

## Test

```ts
import assert from 'node:assert/strict';
import { exerciseTest } from '../../helpers/exercise-test.js';
import { expectThrows, expectRejects } from '../../helpers/assertions.js';
import { fn } from '../../../src/exercises/<module>/<id>.js';

exerciseTest('<id> <behavior>', async () => {
  /* arrange-act-assert */
});
```

- Тесты проверяют контракт, edge cases, ошибки, async cleanup и конкурентность, а не
  внутреннюю реализацию.
- Для ожидаемых ошибок использовать `expectThrows`/`expectRejects`, а не `assert.throws`:
  иначе `NotImplementedError` будет скрыт matcher-ом.
- `assert.throws`/`assert.rejects` допустимы только для проверки собственных fakes.
- Никакого общего mutable state между тестами; temp-каталоги удалять в `finally`.
- Тест не должен зависеть от внешних сервисов; для них — `test/integration` и env guard.

## Solution

- Полная реализация, те же публичные типы/сигнатуры.
- Не импортировать типы из starter (при копировании получится self-import). Локальные
  `interface`/`type` в solution допустимы.
- Не менять `package.json`, tsconfig, helpers и чужие модули.
- Относительные импорты к shared-коду — `../../shared/...` (совпадает после swap).

## Команды проверки модуля

```bash
npm run test:exercises -- --test-name-pattern="NN-"
npm run verify:solutions -- --module=NN --test-name-pattern="NN-"
npm run typecheck
npm run lint
```

`npm test` в нестрогом режиме показывает TODO как `todo`; это нормально для starter.

## Интеграционные тесты

- Только в `test/integration/`, с guard:
  `{ skip: process.env.RUN_INTEGRATION_TESTS !== 'true' }`.
- Env: `DATABASE_URL`, `REDIS_URL`, `KAFKA_BROKERS` (см. `.env.example`).
- Не создавать Docker/Compose/K8s/CI.
- Каждый ресурс закрывается в `finally`; тест не должен висеть после завершения.

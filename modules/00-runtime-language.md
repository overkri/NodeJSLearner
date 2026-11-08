# Модуль 00. Runtime и язык

**Время:** 3 ч. **Предварительные требования:** знакомство с Java/Spring, Git; Node.js 26 установлен.
**Веха:** CLI читает JSON-конфиг и файл данных, валидирует их и считает хэш.

## Цель

Снять главный риск перехода с Java: JavaScript — не «Java без типов». Нужно понимать
семантику значений и ссылок, truthiness, `bigint`, коллекции, ESM, асинхронный `fs`,
`path` и `Buffer`, прежде чем строить HTTP-сервер.

## Теория

### Значения, ссылки, равенство

- Примитивы (`string`, `number`, `bigint`, `boolean`, `undefined`, `null`, `symbol`)
  сравниваются по значению через `===`. Объекты и массивы — по ссылке.
- `==` приводит типы (`'' == 0`, `null == undefined`). В коде используйте только `===`.
- `undefined` — отсутствие значения, `null` — явное «пусто». В HTTP/JSON отсутствие поля
  и `null` часто означают разное; не смешивайте.
- Truthiness: ложны `false`, `0`, `0n`, `''`, `null`, `undefined`, `NaN`. Поэтому проверка
  `if (value)` пропускает строку `"0"` и число `0` с разными результатами. Для строк
  проверяйте `value.trim() === ''`.
- `number` — IEEE-754 double. Для денег используйте `bigint` (minor units), а в JSON —
  decimal string. `NaN !== NaN`; `Object.is` различает `-0` и `NaN`, но для денег это не нужно.

### Массивы, объекты, Map/Set

- `sort`, `splice`, `reverse` мутируют массив. `[...items].sort(...)` — копия.
- `Object.keys` возвращает строки и не гарантирует «числовой» порядок так, как ожидается;
  `Map` сохраняет порядок вставки и не приводит ключи к строке.
- `Set` удобен для уникальных id. Проверка `set.has(x)` — O(1) в среднем.
- Spread (`{...obj}`) и `Object.assign` делают поверхностную копию. Вложенные объекты
  остаются общими.

### Функции, `this`, классы

- Функции — объекты; замыкание хранит ссылку на окружение. В цикле с `var` была бы одна
  переменная, с `let` — своя на каждой итерации.
- `this` определяется вызовом, а не объявлением (кроме стрелочных функций). Метод,
  переданный как callback, теряет `this`; используйте `bind` или стрелочную функцию.
- Классы — синтаксис над прототипами. Поля класса в TypeScript могут быть `readonly`
  только на уровне типов; runtime-мутабельность остаётся.

### ESM и npm

- `"type": "module"` включает ESM. Импорты статические, вычисляются до выполнения модуля.
- В NodeNext относительные импорты указывают на **выходной** `.js` файл:
  `import { x } from './x.js'`, даже если исходник `x.ts`.
- Нет `require`, `module.exports`, `__dirname`; есть `import.meta.url`, а путь получают
  через `fileURLToPath`.
- npm: `dependencies` нужны в runtime, `devDependencies` — для сборки/тестов. Lock-файл
  фиксирует дерево; в CI используйте `npm ci`.
- `package.json` — внешние данные. JSON.parse не проверяет схему; TypeScript-интерфейс
  исчезает после компиляции.

### `process`, `fs`, `path`, `Buffer`

- `process.argv` — массив строк: `[node, script, ...args]`. `process.env` — только строки.
- `node:fs/promises` не блокирует event loop. Sync-версии допустимы в стартовом скрипте,
  но не в request path.
- `path.resolve` нормализует и делает абсолютным; `path.relative(root, candidate)` —
  правильный способ проверить, что путь не вышел за root. `startsWith(root)` уязвим:
  `/srv/app-evil` начинается с `/srv/app`.
- `Buffer` — `Uint8Array` с удобными методами. `buffer.length` — байты, не символы.
  `subarray`/`slice` — представления над той же памятью; `Buffer.from` копирует.
- `Buffer.toString('utf8')` заменяет некорректные последовательности на U+FFFD.
  `new TextDecoder('utf-8', { fatal: true })` выбрасывает ошибку.

### Ошибки и стиль

- Бросайте `Error` (или наследника), а не строки. Ошибка должна иметь контекст, но не
  содержать секреты.
- Не используйте `any`: для неизвестного JSON берите `unknown` и валидируйте Zod.
- `console.log` допустим в CLI, но не в request path: там нужен структурированный логгер.

## Файлы модуля

```text
src/exercises/00-runtime-language/00-01.ts ... 00-04.ts
solutions/00-runtime-language/00-01.solution.ts ... 00-04.solution.ts
test/exercises/00-runtime-language/00-01.test.ts ... 00-04.test.ts
src/cli/inspect-config.ts, src/cli/main.ts
test/unit/inspect-config.test.ts
```

## Упражнения

### 00-01. Значения, truthiness, Map/Set, bigint

```ts
parseOptionalMinor(value: string | null | undefined): bigint | null
summarizeLines(lines: readonly LedgerLine[]): LedgerSummary
```

- `null`, `undefined`, пустая/пробельная строка → `null`;
- строго целое число (можно `+`/`-`) → `bigint`; `1.5`, `1e3`, `0x10` — ошибка;
- `"0"` → `0n`, а не `null`;
- сумма по валютам, уникальные account id, признак отрицательной суммы;
- входной массив не мутируется.

**Проверки:** `test/exercises/00-runtime-language/00-01.test.ts`.
**Ловушка:** `if (value)` и `Number(value)`; `Number` теряет точность на больших суммах.

### 00-02. ESM, async fs, внешний JSON

```ts
readPackageMetadata(filePath: string): Promise<PackageMetadata>
```

- читать через `node:fs/promises`;
- валидировать Zod: `name`/`version` — непустые строки, `type` — `module|commonjs`;
- отсутствующий `type` → `commonjs`; отсутствующие `engines`/`dependencies` → пустые;
- вернуть количество зависимостей.

**Проверки:** временный каталог, отсутствующий файл, битый JSON, неверная схема.
**Ловушка:** `JSON.parse` принимает `null` и `[]`; sync I/O в request path.

### 00-03. process.argv, path traversal, валидация CLI

```ts
parseCliArgs(argv: readonly string[]): CliOptions
resolveInside(root: string, userPath: string): string
```

- `--config path`, `--config=path`, `--port n`, `--port=n`, `--verbose`;
- порт 1..65535, дубликаты и неизвестные флаги — ошибка;
- `resolveInside` отклоняет абсолютный путь и `..` за пределы root.

**Проверки:** `/srv/app-evil` не должен считаться частью `/srv/app`.
**Ловушка:** проверка `startsWith(root)`; `parseInt('12abc') === 12`.

### 00-04. Buffer и UTF-8

```ts
readAsciiPrefix(input: Buffer, length: number): string
concatChunks(chunks: readonly Uint8Array[]): Buffer
splitOn(input: Buffer, delimiter: Buffer): Buffer[]
decodeUtf8Strict(input: Buffer): string
sha256Hex(input: Buffer): string
```

- ASCII-prefix проверяет байты и длину;
- `concatChunks` копирует, не алиасит;
- `splitOn` сохраняет пустые сегменты и копирует их;
- strict UTF-8 и sha256 в lowercase hex.

**Проверки:** известный SHA-256 для `abc`, кириллица, битые байты.
**Ловушка:** `length` строки vs длина буфера; `slice` — view, а не копия.

## Мини-проект: `src/cli`

`inspectConfig` читает JSON, валидирует Zod, проверяет `dataFile` внутри root, читает
байты и считает SHA-256. Запуск:

```bash
npm run cli:inspect -- ./ledger.config.json
```

## Команды

```bash
npm test                                   # unit + упражнения (TODO помечены todo)
npm run test:exercises -- --test-name-pattern="00-0"
npm run verify:solutions                   # эталоны подставляются и проверяются
npm run typecheck
npm run lint
```

## Checklist

- [ ] Объясняю разницу `===`/`==`, `null`/`undefined`, `0`/`"0"`.
- [ ] Знаю, почему деньги — `bigint`/minor units, а не `number`.
- [ ] Не мутирую входные массивы без явного намерения.
- [ ] Понимаю, почему в NodeNext импорт `.js`, хотя исходник `.ts`.
- [ ] Проверяю путь через `path.relative`, а не `startsWith`.
- [ ] Читаю файлы асинхронно; различаю view и copy у Buffer.
- [ ] Валидирую внешний JSON в runtime.

## Quiz

1. Что вернёт `Boolean('0')` и `Boolean(0)`?
2. Почему `0.1 + 0.2 !== 0.3` и как это связано с деньгами?
3. Чем `Map` лучше объекта для сумм по валютам?
4. Почему `import './x.js'` корректен в TypeScript ESM?
5. Чем `buffer.subarray(0, 2)` отличается от `Buffer.from(buffer.subarray(0, 2))`?
6. Что не так с `candidate.startsWith(root)`?

<details><summary>Ответы</summary>

1. `true` и `false`: строка `"0"` непустая.
2. IEEE-754 не представляет десятичные дроби точно; деньги храним в minor units.
3. Ключи не приводятся к строкам, сохраняется порядок, удобны `size`/итерация.
4. NodeNext резолвит specifier относительно runtime-файла; после компиляции будет `x.js`.
5. Первое — view над той же памятью, второе — независимая копия.
6. `/srv/app-evil` проходит проверку; нужен `path.relative` и проверка `..`.

</details>

## Cheat sheet

```ts
const n = BigInt('9007199254740993'); // точная сумма
const clean = value?.trim() ?? ''; // null-safe
const copy = [...items]; // поверхностная копия массива
const inside = !path.relative(root, p).startsWith('..');
const bytes = await readFile(p); // Buffer
const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
```

# Модуль 02. Streams

**Время:** 3 ч. **Предварительные требования:** модули 00–01, async iterables.
**Веха:** потоковый CSV import с backpressure и отменой.

## Цель

Научиться обрабатывать данные больше памяти: читать чанки, не терять UTF-8 на границах,
не буферизовать бесконечно и корректно отменять pipeline.

## Теория

### Зачем streams

Файл 10 ГБ нельзя `await readFile`: он окажется в памяти. Stream обрабатывает данные
порциями. В Node есть четыре вида:

- `Readable` — источник (`fs.createReadStream`, HTTP request);
- `Writable` — приёмник (`fs.createWriteStream`, HTTP response);
- `Duplex` — и то и другое (TCP socket);
- `Transform` — Duplex, преобразующий вход в выход.

`objectMode` позволяет передавать объекты, а не только `Buffer`/`Uint8Array`.

### Backpressure

У `Writable` есть `highWaterMark`. `write(chunk)` возвращает `false`, когда внутренний
буфер заполнен; продюсер обязан дождаться `'drain'`. Если игнорировать возврат, память
растёт до OOM. `pipeline()` связывает стадии, распространяет ошибки/отмену и закрывает
ресурсы, но не отменяет необходимость понимать backpressure.

```ts
if (!destination.write(buffer)) {
  await once(destination, 'drain');
}
```

`Readable.pipe()` тоже учитывает backpressure, но не управляет временем жизни всех стадий.
`pipeline` предпочтителен для production.

### Кодировки и границы чанков

Чанк не обязан заканчиваться на границе символа или строки. `Buffer.toString('utf8')` на
каждом чанке может испортить кириллицу/emoji. `StringDecoder` хранит неполную
последовательность между чанками. Строки нужно собирать в carry-буфер и отдавать только
по `\n`; последняя строка может прийти без newline.

CRLF: перед `\n` может стоять `\r`. BOM (`\uFEFF`) встречается в начале CSV.

### Async iteration

`for await (const chunk of readable)` — удобный способ читать поток с backpressure:
следующий чанк запрашивается после обработки предыдущего. Для записи в несколько стадий
лучше `pipeline`. Не смешивайте `data`-события и async iteration на одном stream.

### Ошибки и отмена

- Ошибка в `_transform`/`_write` передаётся в `callback(error)` и разрушает pipeline.
- `pipeline(..., { signal })` уничтожает стадии и реджектит `AbortError`.
- После ошибки нужно снять listeners; иначе возможны unhandled `'error'` и утечки.
- `finished(stream)` помогает дождаться завершения, но не заменяет ownership.

### CSV как учебный формат

CSV не так прост: quoting, escaped commas, newline внутри поля. В курсе формат намеренно
простой (`name,amount`), чтобы сфокусироваться на потоковой механике. Для реального CSV
берите проверенную библиотеку.

## Файлы модуля

```text
src/exercises/02-streams/02-01.ts ... 02-04.ts
solutions/02-streams/*.solution.ts
test/exercises/02-streams/*.test.ts
```

## Упражнения

### 02-01. Async iterable → строки

```ts
async function* readLines(
  stream: AsyncIterable<Uint8Array>,
  options?: { maxLineLength?: number; signal?: AbortSignal },
): AsyncGenerator<string>
```

- UTF-8 может разрываться между чанками;
- CRLF и финальная строка без `\n`;
- пустые строки сохраняются;
- строка длиннее лимита (по умолчанию 65 536) → `LineTooLongError`;
- abort → `AbortError`.

**Проверки:** границы чанков, кириллица/emoji, CRLF, пустой поток, лимит, abort.
**Ловушка:** `chunk.toString()` на каждом чанке.

### 02-02. CSV Transform

```ts
createCsvTransform(): Transform // readableObjectMode, CsvRow
```

- заголовок `name,amount`, затем строки;
- `amountMinor` — `bigint`, только неотрицательное целое;
- пустые строки пропускаются; BOM допустим;
- ошибки с номером строки: нет заголовка, >2 колонок, пустое имя, дробная сумма.

**Проверки:** split-чанки, CRLF/BOM, ошибки протокола, пустой поток.
**Ловушка:** парсить каждый чанк отдельно; терять remainder.

### 02-03. Ручной backpressure

```ts
writeAll(
  destination: Writable,
  chunks: AsyncIterable<Uint8Array>,
  options?: { signal?: AbortSignal },
): Promise<number>
```

- писать все чанки, вернуть число байт;
- при `write() === false` ждать `'drain'`;
- abort уничтожает destination и даёт `AbortError`;
- ошибки destination пробрасываются; listeners снимаются.

**Проверки:** медленный Writable, порядок, ошибка, abort до/во время записи.
**Ловушка:** игнорировать boolean от `write`.

### 02-04. Pipeline

```ts
importCsv(
  source: Readable,
  sink: (row: CsvRow) => Promise<void>,
  options?: { signal?: AbortSignal },
): Promise<{ rows: number; totalMinor: bigint }>
```

- `pipeline(source, createCsvTransform(), writableObjectMode)`;
- sink вызывается последовательно, highWaterMark = 1;
- ошибки source/parser/sink пробрасываются;
- abort останавливает pipeline.

**Проверки:** успех, ошибка sink, ошибка source, abort, уже aborted signal.
**Ловушка:** сначала собрать все строки в массив.

## Мини-проект: CSV import

Модуль 02 — основа будущего импорта ledger-записей: поток → валидация → запись батчами в
PostgreSQL. В HTTP это `202 Accepted` + job status, а не удержание запроса на весь файл.
Лимит размера, abort при disconnect и backpressure обязательны.

## Команды

```bash
npm run test:exercises -- --test-name-pattern="02-"
npm run verify:solutions -- --module=02 --test-name-pattern="02-"
npm run typecheck
npm run lint
```

## Checklist

- [ ] Объясняю `highWaterMark`, `write() === false` и `'drain'`.
- [ ] Знаю, когда `pipeline` лучше `pipe`.
- [ ] Понимаю, почему чанк не совпадает с символом/строкой.
- [ ] Очищаю listeners и обрабатываю `'error'`.
- [ ] Отмена идёт через `AbortSignal` и разрушает стадии.
- [ ] Не буферизую весь поток без необходимости.

## Quiz

1. Что означает `write()` → `false`?
2. Почему `pipeline` предпочтительнее ручного `pipe`?
3. Как разбить поток на строки без потери UTF-8?
4. Что произойдёт, если игнорировать backpressure?
5. Чем `objectMode` отличается от обычного stream?
6. Как abort влияет на буферизованные данные?

<details><summary>Ответы</summary>

1. Внутренний буфер достиг highWaterMark; нужно ждать `drain`.
2. Распространяет ошибки, отмену и закрывает все стадии.
3. StringDecoder + carry-буфер + split по `\n`.
4. Буфер вырастет, память закончится, latency деградирует.
5. Передаются объекты, highWaterMark считается в объектах.
6. Pipeline уничтожает стадии; необработанные данные теряются, нужен явный протокол.

</details>

## Cheat sheet

```ts
for await (const chunk of readable) {
  /* backpressure */
}
if (!writable.write(buf)) await once(writable, 'drain');
await pipeline(source, transform, sink, { signal });
const decoder = new StringDecoder('utf8');
```

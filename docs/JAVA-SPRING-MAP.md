# Java/Spring → Node/Nest: карта аналогий

Аналогия помогает перенести опыт, но не является равенством. В таблице указана граница.

## Runtime

| Java/Spring                | Node/Nest                          | Граница аналогии                                                                |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| JVM                        | V8 + libuv + Node process          | JVM управляет памятью и потоками; Node имеет один основной JS thread            |
| Thread pool / ForkJoinPool | libuv thread pool + worker_threads | libuv pool скрыт и обслуживает fs/dns/crypto; CPU-bound JS блокирует event loop |
| CompletableFuture          | Promise                            | Promise — не поток и не отменяемая задача; отмена через AbortSignal             |
| `synchronized`             | нет общего lock для JS-кода        | гонки возможны на уровне БД/внешних ресурсов между процессами                   |
| Stack trace                | `Error.stack` + async stack        | асинхронные цепочки могут терять контекст; нужен request context                |
| `ThreadLocal`              | `AsyncLocalStorage`                | контекст привязан к async-цепочке, не к потоку                                  |

## Web

| Java/Spring                  | Node/Nest                 | Граница аналогии                                                    |
| ---------------------------- | ------------------------- | ------------------------------------------------------------------- |
| Servlet container            | `node:http` + event loop  | нет thread-per-request; один медленный CPU-участок тормозит всех    |
| Filter                       | middleware                | порядок регистрации критичен; `next()` не является `chain.doFilter` |
| HandlerInterceptor           | Nest interceptor          | interceptors оборачивают handler, но не заменяют middleware         |
| `@RestController`            | Nest controller           | HTTP-адаптер отделён от domain/application                          |
| `@Service`                   | Nest provider             | в голом Node DI отсутствует; зависимости передаются явно            |
| `@ConfigurationProperties`   | env + Zod                 | env — строки; валидация обязательна в runtime                       |
| Bean Validation              | Zod + validation pipe     | TS-типы стираются; схема — единственный источник истины             |
| `@ExceptionHandler`          | exception filter          | ошибки нужно явно маппить в HTTP envelope                           |
| Spring Security filter chain | middleware/guard + `jose` | verify токена и authorization — разные шаги                         |
| `@PreAuthorize`              | guard + policy            | нет SpEL по умолчанию; проверки пишутся кодом                       |

## Данные

| Java/Spring             | Node/Nest                  | Граница аналогии                                     |
| ----------------------- | -------------------------- | ---------------------------------------------------- |
| Hibernate/JPA           | Drizzle + `pg`             | нет identity map, lazy loading и dirty checking      |
| HikariCP                | `pg.Pool`                  | client нужно вернуть в `finally`; pool не бесконечен |
| `@Transactional`        | явный transaction callback | нет proxy propagation; границы видны в коде          |
| `SELECT ... FOR UPDATE` | тот же SQL                 | блокировки и deadlock — ответственность БД           |
| Flyway/Liquibase        | drizzle-kit migrations     | migrations — SQL-файлы в репозитории                 |
| N+1                     | N+1                        | ORM не спасает; нужны join/batch и тесты запросов    |

## Наблюдаемость и интеграции

| Java/Spring      | Node/Nest                       | Граница аналогии                                                    |
| ---------------- | ------------------------------- | ------------------------------------------------------------------- |
| Logback/MDC      | Pino + request context          | структурированные поля, redaction                                   |
| Micrometer       | prom-client                     | registry и labels задаются явно; cardinality контролируется вручную |
| Actuator health  | `/health`, `/ready`             | проверки зависимостей пишутся явно                                  |
| `@KafkaListener` | KafkaJS consumer loop           | offset commit, retry и shutdown — явные                             |
| `@Scheduled`     | `setInterval`/outbox poller     | нет контейнера планировщика; lifecycle и ошибки свои                |
| `@PreDestroy`    | signal handler / Nest lifecycle | cleanup нужно организовать и ограничить таймаутом                   |

## Тесты

| Java/Spring    | Node/Nest                | Граница аналогии                                       |
| -------------- | ------------------------ | ------------------------------------------------------ |
| JUnit          | `node:test`              | тесты асинхронные; забытый `await` даёт ложный успех   |
| Mockito        | fakes/ручные stubs       | DI контейнер не обязателен; предпочтительны порты      |
| MockMvc        | supertest/fetch          | сервер можно поднять на ephemeral port                 |
| Testcontainers | внешние сервисы + env    | курс не создаёт compose; integration включается флагом |
| Awaitility     | `waitFor`/polling helper | таймауты и cleanup обязательны                         |

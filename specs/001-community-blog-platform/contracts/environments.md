# Contract: Окружения и запуск

Как устроена папка `infra/`, чем отличаются `local`, `dev` и `prod`, какие команды поднимают окружение и что предполагается снаружи репозитория. Реализует FR-123–FR-126 и FR-132. Тестовые данные — [seed.md](./seed.md). Решения — [research.md](../research.md), пункты 31–36.

## Состав `infra/`

```text
infra/
├── compose/docker-compose.yml, docker-compose.local.yml, docker-compose.dev.yml, docker-compose.prod.yml
├── env/local.env.example, dev.env.example, prod.env.example, local.host.env.example
├── docker/service.Dockerfile, web.Dockerfile, web.nginx.conf, .dockerignore
├── mock-google/                # только local и dev
└── scripts/up.ts, down.ts, seed.ts, bootstrap-prod.ts
```

В корне репозитория и в `docker/` нет ни `docker-compose.yml`, ни Dockerfile. Всё, что запускает окружение, лежит в `infra/`.

## Что запускается

| Контейнер | Кто | Постоянный | `local` | `dev` | `prod` |
| --- | --- | --- | --- | --- | --- |
| `gateway`, `identity`, `content`, `discussion`, `messaging`, `notification`, `media` | Сервисы | да | да | да | да |
| `identity-db`, `content-db`, `discussion-db`, `messaging-db`, `notification-db`, `media-db` | PostgreSQL 16, по одной на сервис (у `gateway` базы нет) | да | да | да | да |
| `nats` | NATS JetStream | да | да | да | да |
| `minio` | S3-совместимое хранилище | да | да | да | да |
| `web` | Статика клиента на `nginx-unprivileged` | да | да | да | да |
| `mock-google` | Тестовый OIDC-провайдер, FR-132 | да | да | да | **нет** |
| `<service>-migrate` ×6 | Миграции своей базы | одноразовый | да | да | да |
| `minio-init` | Создаёт bucket `media` | одноразовый | да | да | да |

Больше в составе ничего нет (FR-126): ни обратного прокси, ни Prometheus, Grafana, сборщика трасс и логов, ни Redis, ни резервного копирования. `GET /metrics` и OTel-инструментация остаются в коде сервисов по правилу `node-microservices.mdc`; их никто в окружении не опрашивает.

## Чем отличаются окружения

В базе — всё общее: образы, сеть, `depends_on`, `healthcheck`, команды, именованные тома. Файл окружения меняет только:

| Что | `local` | `dev` | `prod` |
| --- | --- | --- | --- |
| Образы сервисов и клиента | Сборка из исходников (`build:`) | Из реестра, тег — переменная | Из реестра, тег — переменная |
| Опубликованные порты | Клиент `8080`, `gateway` `3000`, `mock-google` `8081`, базы `5433`–`5438`, NATS `4222`, MinIO `9000`/`9001` | Клиент, `gateway`, `mock-google` | Клиент и `gateway` |
| `mock-google` | Есть, с `aliases` по адресу издателя | Есть, с `aliases` по адресу издателя | Нет |
| Перезапуск | `no` | `unless-stopped` | `unless-stopped` |
| Ограничение памяти и `NODE_OPTIONS=--max-old-space-size` ≈ 75 % лимита | Нет | Мягкое | Да |
| Переменные | `local.env` | `dev.env` | `prod.env` |
| `APP_ENV` | `local` | `dev` | `prod` |

## Команды

Запускаются из корня репозитория. `<env>` — `local`, `dev` или `prod`.

| Команда | Что делает |
| --- | --- |
| `pnpm infra:up <env>` | Проверяет `infra/env/<env>.env`, собирает `-f base -f <env>`, поднимает всё целиком, ждёт готовности `gateway` и клиента |
| `pnpm infra:down <env>` | Останавливает контейнеры, тома не трогает. `-- --volumes` удаляет и тома |
| `pnpm infra:seed <env> <small\|large>` | См. [seed.md](./seed.md). В `prod` — ошибка до любого действия |
| `pnpm infra:bootstrap-prod` | Суперадминистратор и настройки по умолчанию. См. [seed.md](./seed.md) |
| `pnpm local` | `infra:up local` и `infra:seed local small` — вся цепочка SC-026 одной командой |

`pnpm infra:up prod` отказывается стартовать, если `infra/env/prod.env` отсутствует или содержит `CHANGE_ME`, и если собранная конфигурация содержит `mock-google`.

Проверка состава — тест, а не договорённость: `docker compose -f base -f prod config --services` не содержит `mock-google` и не содержит ничего сверх таблицы выше.

## Переменные и секреты

- В `infra/env/` коммитятся только `*.env.example` с заглушками `CHANGE_ME`. Реальные `infra/env/*.env` попадают в `.gitignore` отдельной строкой: шаблон `.env.*` корневого `.gitignore` файлы вида `local.env` не покрывает.
- `APP_ENV` обязателен в каждом сервисе и читается только в `config/env.ts`. Отсутствие любой обязательной переменной роняет сервис. В `prod` заглушка `CHANGE_ME` в `SERVICE_JWT_PRIVATE_KEY`, `GOOGLE_CLIENT_SECRET`, паролях баз и ключах MinIO тоже роняет сервис.
- Ключи Google (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) читает только `identity-service`. В бандле клиента секретов нет; `VITE_API_BASE_URL` — не секрет.
- `local.host.env.example` содержит те же ключи с адресами `localhost`, чтобы запустить один сервис с хоста (`pnpm --filter <service> dev`) против контейнеров баз и NATS.

## Вход через `mock-google`

| Конечная точка | Что отдаёт |
| --- | --- |
| `GET /.well-known/openid-configuration` | Метаданные: `issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`; все — на одном хосте |
| `GET /authorize` | Страница выбора seed-участника: суперадминистратор, администратор, автор, читатель, ограниченный, без права публикации, новый. Принимает `client_id`, `redirect_uri`, `state`, `nonce`, `code_challenge`, `code_challenge_method=S256`; после выбора перенаправляет на `redirect_uri` с `code` и `state` |
| `POST /token` | `id_token` (RS256), `access_token`; проверяет `code`, `redirect_uri`, `code_verifier` |
| `GET /jwks` | Публичный ключ; пара создаётся при старте контейнера |

Клейм `id_token`: `iss`, `aud`, `sub`, `nonce`, `email`, `email_verified=true`, `name`, `picture`, `iat`, `exp`. `sub` и `email` участников совпадают с записями `identity-service` после seed ([seed.md](./seed.md)).

Единственная разница между окружениями для `identity-service` — `GOOGLE_ISSUER_URL`: в `prod` `https://accounts.google.com`, в `local` и `dev` — адрес `mock-google`. Он обязан открываться одинаково браузером и контейнером `identity-service`: `iss` в `id_token` сверяется с издателем. В `local` это `http://mock-google.localhost:8081` (браузер ведёт `*.localhost` на 127.0.0.1, в сети Compose у `mock-google` тот же адрес задан как `aliases`, порт внутри и снаружи один). В `dev` — имя, которое разработчики резолвят до сервера, с тем же `aliases`. В `prod` `identity-service` отказывается стартовать с любым другим издателем. Никаких обходных эндпоинтов входа, включаемых флагом, нет ни в одном сервисе.

## Что предполагается снаружи репозитория

Репозиторий не содержит внешнего входа `prod`. Чтобы площадка работала, он должен:

| Требование | Зачем |
| --- | --- |
| Отдавать клиент и `gateway` с одного origin по HTTPS | Cookie `Secure; HttpOnly; SameSite=Lax` и double-submit CSRF работают только на одном origin; `VITE_API_BASE_URL` в `prod` пустой |
| `/v1/*` (включая `GET /v1/events`) → `gateway`, без буферизации ответа и с таймаутом простоя не меньше 60 с | SSE перестаёт работать через буфер и короткий таймаут |
| Запросы поисковых роботов и превью ссылок к `/p/{slug}`, `/u/{slug}`, `/t/{slug}` → `gateway` (`prerender`), остальное → `web` | Роботы получают заголовок, описание, картинку и текст, люди — приложение |
| Резервное копирование томов PostgreSQL и MinIO | Репозиторий копий не делает (FR-126) |

## Порядок запуска

```text
postgres ×6, nats, minio ─healthy→ <service>-migrate, minio-init ─completed→ identity → content, discussion, messaging, notification, media → gateway → web
```

Сервисы ждут свою базу и NATS по `service_healthy` и свою миграцию по `service_completed_successfully`. `gateway` ждёт готовности остальных (`/health/ready`). Миграции не запускаются на старте реплик.

## Ошибки и граничные случаи

| Ситуация | Результат |
| --- | --- |
| База не поднялась | Её сервис не становится готовым; остальные стартуют, `gateway` отдаёт ошибку в затронутом разделе (FR-121) |
| Миграция упала | Сервис не стартует; `infra:up` завершается с кодом ошибки и именем задачи |
| `mock-google` недоступен в `local` | Вход не работает, чтение гостем — да |
| Запущена команда `seed` в `prod` | Ошибка до запуска любого контейнера |

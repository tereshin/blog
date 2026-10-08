# Implementation Plan: Платформа публикаций и обсуждений

**Branch**: `001-community-blog-platform` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-community-blog-platform/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Площадка даёт гостю чтение, участнику — вход через Google, профиль, черновик и публикацию в блочном редакторе, обсуждение с четырьмя реакциями, подписки, закладки, поиск, уведомления и личные сообщения, а суперадминистратору — темы, язык, оформление и модерацию. Браузер общается только с `gateway`; за ним шесть сервисов по bounded context, у каждого своя база PostgreSQL. Правила доступа проверяет владелец данных (контент — видимость статьи, обсуждение — право комментировать), а `gateway` лишь передаёт проверенный контекст сессии. Между сервисами — события через брокер с outbox; открытая статья, лента и колокольчик получают изменения потоком событий от `gateway` и повторным чтением, без перезагрузки страницы.

На экране всё живёт в одном каркасе: шапка, левая карточка навигации, центр и правая карточка «Популярные комментарии». Каркас — корневой layout-маршрут клиентского приложения: маршрутизатор меняет только центр, поэтому шапка и обе карточки не размонтируются при переходе и видны в первом кадре прямой ссылки ещё до ответа сервисов. На ширине от 1200px сетка высотой в окно отдаёт прокрутку центру и, когда темы не влезают, левой карточке. Ниже 1200px тот же каркас складывается в одну колонку. Центр наполняют лента карточек, полная статья и две карточки профиля; тёмный и светлый вид образца задаются темой HeroUI.

Запуск устроен одинаково во всех трёх окружениях: всё лежит в `infra/` (FR-123), каждое окружение — один базовый Docker Compose-файл плюс по одному файлу на `local`, `dev`, `prod` (FR-124), и поднимает все сервисы, шесть баз, NATS, MinIO и клиентское приложение одной командой (FR-125). Кроме этого в `infra/` ничего нет: ни обратного прокси, ни мониторинга, ни Redis, ни резервного копирования (FR-126). Тестовые данные создаёт детерминированный seed двух объёмов, только в `local` и `dev`; в `prod` он падает до первой записи, а минимум (суперадминистратор и настройки по умолчанию) создаёт отдельная команда (FR-127–FR-131). Вход под тестовыми участниками идёт через контейнер `mock-google` — отдельный OIDC-провайдер вместо Google; `identity-service` проходит тот же путь входа, отличается только адрес издателя в конфигурации (FR-132).

## Technical Context

**Language/Version**: TypeScript (strict) везде. Клиент — React 19, Vite, слои FSD в `apps/web`. Сервисы — Node.js 22 LTS, ESM, Fastify, в `services/*`. pnpm workspaces.

**Primary Dependencies**: Клиент: React Router (вложенные маршруты: один родительский layout-маршрут каркаса, дочерние — центр), TanStack Query (infinite query для ленты), Zustand только для состояния оболочки и UI, HeroUI v3 + Tailwind CSS 4 как база `shared/ui` (карточки, `Drawer` для панели навигации, диалоги, вкладки, меню, `Skeleton`), `@tanstack/react-virtual` для списков длиннее 100 карточек, Editor.js только в браузере с фиксированным набором инструментов, каталоги надписей `ru`, `en`, `sr`. Карточки, пилюли и ряды реакций — compound-компоненты поверх `shared/ui`; вид образца задаётся темой HeroUI и `cva`-вариантами, не отдельной библиотекой. Сервисы: Fastify с zod-схемами (→ OpenAPI), Drizzle ORM + PostgreSQL 16 на сервис, NATS JetStream как брокер, pino, OpenTelemetry, undici для вызовов между сервисами. `identity-service` сам ведёт OAuth-обмен с Google (`openid-client`) и выдаёт серверную сессию. Контракты событий и HTTP — в `packages/contracts`. Окружения: Docker Compose v2 (Kubernetes не требуется), `node:22-slim` для сервисов, `nginx-unprivileged` для статики клиента. Тестовые данные: `packages/seed-data` (чистые детерминированные генераторы: UUIDv5, зерно PRNG, без доступа к БД), `seed`-модуль в каждом сервисе, который пишет только в свою базу. Тестовый вход: `infra/mock-google` на Fastify + `jose`, реализует discovery, `authorize`, `token`, `jwks`.

**Storage**: База на сервис (database-per-service): `identity` — участники, роли, сессии; `content` — профили, темы, статьи, реестр коротких адресов, подписки, продвижение, поиск, настройки площадки, жалобы; `discussion` — комментарии, реакции, просмотры, закладки, просмотренное в ленте, репутация; `messaging` — диалоги и сообщения; `notification` — уведомления; `media` — метаданные файлов, байты в S3-совместимом хранилище (MinIO локально). Чужие данные для чтения (имя автора, название статьи, счётчики, репутация) каждый сервис денормализует у себя по событиям. В браузере — только query-кэш в памяти, тема в `localStorage`, место прокрутки ленты и закрытая полоса «скрыто» в `sessionStorage`. Распределение сущностей — [data-model.md](./data-model.md). В каждой базе, где есть данные seed, — таблица `seed_runs(profile, anchor_at, finished_at)`; тома PostgreSQL и MinIO — именованные тома Compose.

**Testing**: Vitest: unit для use case'ов без БД (отбор «Популярного», одна реакция на объект, репутация, знаки, срок продвижения, функция подсветки пункта, форматирование чисел и времени); integration через testcontainers (PostgreSQL, NATS) — доступ, адреса, публикация, окно просмотра, идемпотентность потребителей (событие дважды — эффект один). Контрактные тесты фикстур событий из `packages/contracts` с обеих сторон. Storybook: story на каждое состояние карточки ленты, карточек профиля, ряда реакций, левой и правой карточек (данные / пусто / загрузка / ошибка). Playwright для путей из [quickstart.md](./quickstart.md) против окружения `local` (Compose, малый seed, вход через `mock-google`), на 1280px и 390px, в тёмном и светлом виде; длинная лента и нагрузка SC-010 — против большого seed; до готовности сервисов — против фикстурного `gateway` (MSW) с тем же контрактом. Тесты окружений и seed: запрет seed в `prod` (до любой записи, SC-027); идемпотентность seed (второй запуск не меняет число строк ни в одной базе, SC-027); покрытие малого seed — тест обходит список сущностей и состояний из FR-130 (SC-028); согласованность копий (счётчики, репутация и копии полей после seed совпадают с пересчётом владельцем); статическая проверка `docker compose config`: в `prod` нет `mock-google`, в составе нет ничего сверх FR-126.

**Target Platform**: Браузер + контейнеры сервисов (по одному процессу, масштабирование репликами). Поток событий держит `gateway`; реплики `gateway` подписаны на брокер, поэтому соединение не привязано к процессу-писателю. Широкий каркас от 1200px, узкий — ниже; отдельного приложения для телефона нет. Окружения `local`, `dev`, `prod` — по одному серверу каждое, без оркестратора; `prod` отдаёт наружу два порта (клиент и `gateway`), TLS и маршрутизацию (`/v1/*` и ответ роботам → `gateway`, остальное → клиент) делает внешний вход вне репозитория — [environments.md](./contracts/environments.md). Поисковикам и превью ссылок публичные адреса отдаёт `gateway` отдельным ответом, каркас в нём не участвует.

**Performance Goals**: Гость дочитывает путь до публичной статьи без учётной записи (SC-001). Каркас виден в первом кадре приложения, до ответа сервисов; переход внутри маршрутизатора не размонтирует шапку и карточки; initial JS ≤ 200 KB gzip, страницы разделов — `React.lazy` по границе slice. Уже открытая статья показывает новый комментарий, реакцию, просмотр или правку автора в течение 2 секунд (SC-009): запись → outbox → брокер → `gateway` → SSE → перечитывание. Тысяча одновременных читателей не теряет принятый комментарий или реакцию (SC-010). Отклик на действие ≤ 200 мс (SC-017): оптимистичные мутации с откатом. Первая порция ленты ≤ 2 с, лента из 500+ карточек без рывков (SC-021): запрос ленты стартует вместе с загрузкой slice страницы, prefetch следующей порции при приближении к концу, виртуализация. «Показать полностью» ≤ 1 с (SC-008). Обрыв до 30 с — догон за 5 с (SC-024): клиент переподключается с backoff и перечитывает затронутые ключи. Лаг event loop p99 ≤ 50 мс на сервис.

**Constraints**: Вход только через Google. Cookie-сессия `HttpOnly; Secure; SameSite=Lax`, ставит `gateway`, проверяет `identity`; сервисам уходит подписанный служебный контекст, не cookie. CSRF — double-submit. Язык интерфейса один на всю площадку, тексты людей не переводятся. Черновик и закрытая статья не попадают в ленту, поиск, тему, чужой профиль, правую карточку и ответ роботам. Короткий адрес уникален среди профилей, тем и статей и не занимает служебный сегмент. Одна реакция участника на статью и одна на комментарий; набор видов закрыт. Подписка на себя не предлагается. «Купить показы» до подтверждения прямо говорит, что деньги не списываются; чужой не видит полосу охвата. Одна оболочка на публичные разделы и администрирование; пустая правая карточка сохраняет свою колонку; панели не подменяют layout. Все действия выполнимы с клавиатуры и названы для читалки экрана (SC-022) — за счёт HeroUI, не ручной разметки. Синхронные цепочки не длиннее `gateway → A → B`; межсервисный HTTP — с таймаутом 3 с, circuit breaker, ретраи только для идемпотентных операций. Все мутации идемпотентны по `X-Idempotency-Key` и идут через `features/*` и `@/shared/api`. Оболочка маршрутов — контракт [разделов каркаса](./contracts/sections.md). Секреты в репозитории не хранятся: в `infra/env/` коммитятся только `*.env.example` с заглушками, реальные `*.env` в `.gitignore`. Состав `infra/` закрыт списком FR-126 плюс `mock-google` в `local` и `dev`. Обходного эндпоинта входа нет ни под каким флагом; `identity-service` в `prod` не стартует, если `GOOGLE_ISSUER_URL` не равен `https://accounts.google.com`. `seed` читает `APP_ENV` только через `config/env.ts` и в `prod` завершается до открытия соединения на запись. Seed не меняет и не удаляет строки, созданные не им.

**Scale/Scope**: Одна площадка, 7 сервисов, 6 баз. 18 адресов одного layout-маршрута, четыре зоны каркаса, две карточки центра только у профиля. Сущности из спецификации плюс реестр коротких адресов, жалоба, сессия и outbox в каждом сервисе. Лента порциями по 20 статей, курсорная пагинация. Правая карточка — 10 комментариев. Четыре вида реакций, три знака, продвижение на 7 дней. Надписи интерфейса на русском, английском и сербской латинице. Три окружения; постоянных контейнеров в `prod` 16 (7 сервисов, 6 баз, NATS, MinIO, клиент) плюс одноразовые задачи миграций и создания bucket; в `local` и `dev` добавляется `mock-google` — [environments.md](./contracts/environments.md). Малый seed — несколько десятков записей на сущность, большой — 500+ опубликованных статей и тысячи комментариев.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Конституция `.specify/memory/constitution.md` — незаполненный шаблон. Роль ворот выполняют правила `.cursor/rules`:

| Правило | Что проверяется в этой фиче | Статус |
| --- | --- | --- |
| `node-microservices.mdc` | Сервис = bounded context = своя БД; общение только через контракты `packages/contracts`; outbox для событий; идемпотентные потребители; новые таблицы реакции, закладки, подписки, продвижения — у владельцев, счётчики и репутация — в транзакции с outbox; `/v1/<ресурсы>` и `snake_case`; `config/env.ts`, pino, OTel, `/health/live`, `/health/ready`, `/metrics`; миграции — отдельная одноразовая задача Compose, не старт реплики; seed пишет только в базу своего сервиса, события в обход outbox не публикует; в коде сервисов остаются OTel-инструментация и `/metrics`, а коллектор, Prometheus и Redis в `infra/` не входят (FR-126) — экспорт включается переменной, когда внешний сборщик появится | PASS, одно отклонение по расположению Dockerfile — см. Complexity Tracking |
| `react-architecture.mdc` | Vite + FSD; каркас в `widgets/shell`, подключён один раз в layout-маршруте; страницы `pages/*` только компонуют; карточки — `entities/article/ui`, действия — `features/react`, `features/follow`, `features/bookmark`, `features/promote-article`; запросы только через `@/shared/api`; DTO → модель в `entities/*/api`; серверное состояние в TanStack Query, клиентское — `useState`/Zustand; `import.meta.env` только в `shared/config/env.ts`; импорты через `index.ts`; нет prop drilling глубже 2 уровней — зоны каркаса получают `children`/slots | PASS |
| `react-components.mdc` | `shared/ui` на HeroUI v3, compound-идиома (`ArticleCard.Header`, `.Body`, `.Reactions`, `.Actions`; `<Shell header={…} left={…} right={…}>`), слоты вместо булевых пропсов вроде `isOwn`; состояния `loading`/`empty`/`error` — часть контракта; story на каждый вариант | PASS |
| `react-naming.mdc` | `PascalCase.tsx` компоненты, `useFeed.ts`, `useReaction.ts`, `articleKeys.list(mode)`, `snake_case` переменные (`is_own_profile`, `is_nav_open`), `handleReact`, `onFollow` | PASS |
| `react-performance.mdc` | `React.lazy` на страницы, курсорная пагинация, infinite query, виртуализация > 100 карточек, срезы из стора оболочки, `staleTime` ≥ 30 с для тем и популярных комментариев, батчинг входящих событий раз в 50–100 мс, переподключение с backoff и jitter, точечная инвалидация ключей, оптимистичные мутации | PASS |
| `session-security.mdc` | Секретов в бандле нет: ключи Google только в `identity-service`. Cookie-сессия от `gateway`; `401` в любом запросе → панель входа поверх раздела; выход инвалидирует сессию на сервере и во всех вкладках; офлайн-кэша нет; `sessionStorage` — только место прокрутки и закрытая полоса; тема — `localStorage`; никаких данных участника в хранилищах; в `infra/` коммитятся только `*.env.example` с заглушками; обходного входа нет — `mock-google` подменяет Google на уровне конфигурации издателя OIDC и отсутствует в `prod`, а в `prod` `identity-service` отказывается стартовать с чужим издателем | PASS |

Отклонения, требующие обоснования, — в Complexity Tracking.

- До Phase 0: PASS
- После Phase 1: PASS. Отдельного сайта администратора, второго каркаса, отдельного приложения ленты и второй модели «лайк плюс реакция» дизайн не заводит. Одно решение — layout-маршрут — не даёт разделам разъехаться. Семь сервисов — осознанное решение сессии уточнений, не дрейф. Окружения и seed (FR-123–FR-132) не добавляют обходных путей: у входа один код, у seed нет доступа к чужим базам, в `prod` нет ничего сверх списка FR-126.

## Project Structure

### Documentation (this feature)

```text
specs/001-community-blog-platform/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── access.md        # вход, роли, профиль, вид
│   ├── content.md       # статья, документ блоков, файлы
│   ├── discussion.md    # комментарии, реакции, просмотры
│   ├── discovery.md     # поиск, уведомления, сообщения
│   ├── admin.md         # настройки площадки, темы, модерация
│   ├── realtime.md      # поток событий
│   ├── shell.md         # зоны каркаса, прокрутка, панели, данные колонок
│   ├── sections.md      # адреса разделов и подсветка
│   ├── feed.md          # левая карточка, карточка ленты, полоса просмотренного
│   ├── article.md       # страница статьи и панель показов
│   ├── profile.md       # две карточки профиля, рейтинг
│   ├── actions.md       # реакции, подписка, закладка, шапка, меню аватара
│   ├── environments.md  # infra/, Compose-файлы, команды, порты, mock-google, внешний вход
│   └── seed.md          # команды seed, профили объёма, идентификаторы, покрытие состояний, prod-минимум
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
pnpm-workspace.yaml                      # apps/*, services/*, packages/*, infra/mock-google
package.json                             # скрипты infra:up, infra:down, infra:seed, infra:bootstrap-prod, local (= up + seed small)

infra/                                   # FR-123: всё инфраструктурное; в корне и в docker/ ничего нет
├── compose/
│   ├── docker-compose.yml               # база: 6 × postgres, nats, minio + minio-init, 7 сервисов, одноразовые <service>-migrate, web
│   ├── docker-compose.local.yml         # + mock-google, открытые порты баз, сборка из исходников, малый seed доступен
│   ├── docker-compose.dev.yml           # + mock-google, образы из реестра, закрытые порты баз
│   └── docker-compose.prod.yml          # без mock-google, образы из реестра, restart, лимиты памяти, только порты клиента и gateway
├── env/
│   ├── local.env.example  dev.env.example  prod.env.example     # заглушки; реальные *.env в .gitignore
│   └── local.host.env.example                                   # те же переменные с localhost — для запуска сервиса с хоста
├── docker/
│   ├── service.Dockerfile               # multi-stage, ARG SERVICE → pnpm deploy --prod --filter; общий для 7 сервисов
│   ├── web.Dockerfile                   # сборка Vite → nginx-unprivileged, SPA-fallback на index.html
│   ├── web.nginx.conf
│   └── .dockerignore
├── mock-google/                         # FR-132: OIDC-провайдер вместо Google, только local и dev
│   ├── src/{main.ts,app.ts,config/env.ts,routes/{discovery,authorize,token,jwks}.ts,ui/pick-participant.ts}
│   └── Dockerfile
└── scripts/
    ├── up.ts  down.ts                   # собирают -f базы и окружения, --env-file; проверяют, что для prod нет mock-google
    ├── seed.ts                          # оркестратор: порядок сервисов, профиль, APP_ENV; в prod — ошибка до запуска чего-либо
    └── bootstrap-prod.ts                # суперадминистратор и настройки по умолчанию, без тестовых людей

apps/web/                                # клиентское приложение, Vite
├── index.html
├── vite.config.ts
└── src/
    ├── main.tsx                         # createRoot, StrictMode
    ├── app/
    │   ├── App.tsx
    │   ├── providers/                   # QueryClientProvider, HeroUIProvider, ThemeProvider
    │   ├── routes/
    │   │   ├── router.tsx               # один layout-маршрут ShellLayout, дети — pages/*
    │   │   └── ShellLayout.tsx          # <Shell> + <Outlet/> в центре + Suspense с заготовкой центра
    │   └── styles/globals.css
    ├── pages/                           # по одному slice на раздел контракта sections.md, все — React.lazy
    │   ├── fresh-feed/  popular-feed/  my-feed/  topic/      # FeedPage с режимом
    │   ├── article/                                          # ArticlePage
    │   ├── profile/  followers/  following/  rating/  bookmarks/
    │   ├── messages/  search/  about/  editor/
    │   └── admin-moderation/  admin-topics/  admin-settings/
    ├── widgets/
    │   ├── shell/
    │   │   ├── index.ts
    │   │   ├── ui/Shell.tsx             # сетка зон: header / left / center / right
    │   │   ├── ui/SiteHeader.tsx        # слоты: центр шапки, меню аватара
    │   │   ├── ui/HeaderCenter.tsx      # пилюля / поиск / возврат
    │   │   ├── ui/AccountMenu.tsx
    │   │   ├── ui/LeftNav.tsx           # режимы, сообщения, рейтинг, темы; прокрутка внутри
    │   │   ├── ui/LeftNavDrawer.tsx     # та же LeftNav в панели ниже 1200px
    │   │   ├── ui/RightRail.tsx         # «Популярные комментарии»: данные / пусто / загрузка / ошибка
    │   │   ├── ui/BackToTop.tsx
    │   │   ├── ui/CenterSkeleton.tsx
    │   │   ├── model/useShellStore.ts   # is_nav_open, center_scroll_top
    │   │   └── lib/section-highlight.ts # вид раздела → подсветка, чистая функция
    │   ├── feed/                        # ui/Feed.tsx (infinite + virtual), ui/SeenBanner.tsx, model/useFeed.ts
    │   ├── article-view/                # ui/ArticleView.tsx, ui/ReachBanner.tsx
    │   ├── profile-card/                # ui/ProfileCard.tsx, ui/ProfileListCard.tsx
    │   ├── editor/                      # Editor.js, только клиент
    │   ├── notification-bell/
    │   └── conversation/
    ├── features/
    │   ├── login/  logout/
    │   ├── react/                       # ui/ReactionRow.tsx, model/useReaction.ts (оптимистично)
    │   ├── follow/                      # ui/FollowButton.tsx, model/useFollow.ts
    │   ├── bookmark/
    │   ├── share-article/
    │   ├── promote-article/             # ui/PromoteDialog.tsx («Купить показы»)
    │   ├── publish-article/  send-comment/  send-message/
    │   ├── moderate-content/  update-settings/  upload-media/
    ├── entities/                        # api/ (DTO + mapper), model/, ui/
    │   ├── session/  user/  settings/
    │   ├── profile/                     # ui/ProfileHeader.tsx, lib/badges.ts
    │   ├── topic/                       # api/get-topics.ts, ui/TopicNavItem.tsx
    │   ├── article/                     # api/get-feed.ts (курсор), ui/ArticleCard.tsx (compound), lib/excerpt.ts
    │   ├── comment/                     # api/get-popular-comments.ts, ui/PopularCommentItem.tsx
    │   ├── reaction/                    # model/reaction-kinds.ts
    │   ├── notification/  conversation/
    └── shared/
        ├── ui/                          # обёртки HeroUI: Card, Drawer, Dialog, Tabs, Menu, Chip, Avatar, Skeleton
        ├── api/http-client.ts           # credentials: 'include', X-CSRF-Token, X-Idempotency-Key, 401 → sessionEvents
        ├── api/event-stream.ts          # SSE, буфер 50–100 мс, backoff + jitter
        ├── config/env.ts                # единственное чтение import.meta.env
        ├── i18n/                        # ru.json, en.json, sr.json
        └── lib/                         # format-count.ts (К/М, K/M), format-time.ts

apps/web/tests/
├── unit/                                # section-highlight, format-count, format-time
└── e2e/                                 # shell.spec.ts, feed.spec.ts, article.spec.ts, profile.spec.ts, …

services/
├── gateway-service/                     # единственный вход браузера
│   └── src/modules/
│       ├── session/                     # cookie ↔ identity, CSRF, служебный контекст сервисам
│       ├── proxy/                       # /v1/* → сервис-владелец, таймауты, circuit breaker
│       ├── events/                      # GET /v1/events: подписка на брокер → SSE по правам зрителя
│       └── prerender/                   # ответ роботам и превью: meta + текст публичной страницы
├── identity-service/                    # Google OAuth, участники, роли, ограничение, сессии
├── content-service/                     # профили, темы, статьи, реестр адресов, подписки, продвижение,
│   └── src/modules/                     # отбор ленты, поиск, настройки площадки, жалобы
│       ├── follow/                      # подписка на автора и тему; питает «Мою ленту»
│       ├── promotion/                   # confirmed_at, until; «Популярное» = 7 суток или активное продвижение
│       └── feed/                        # GET /v1/feed?mode=&cursor=; копии счётчиков по событиям discussion
├── discussion-service/                  # комментарии, реакции, просмотры, закладки, просмотренное,
│   └── src/modules/                     # репутация, популярные комментарии
│       ├── reaction/                    # вид реакции, одна на пару участник–объект, счётчик + outbox
│       ├── bookmark/
│       ├── seen/                        # просмотренное в ленте по режиму
│       └── reputation/                  # считается по реакциям, событие discussion.reputation.updated
├── messaging-service/                   # диалоги и сообщения
├── notification-service/                # уведомления по событиям других сервисов
└── media-service/                       # приём файлов, проверка типа по содержимому, S3

# внутри каждого сервиса — структура правила:
# src/main.ts, app.ts, config/env.ts, modules/<entity>/<entity>.{routes,controller,service,repository,events,schema,types,errors}.ts,
# infra/{db,broker,http,cache}, test/{unit,integration,contract}; образ — общий infra/docker/service.Dockerfile
#
# у сервисов с данными seed (identity, content, discussion, messaging, notification, media) добавлено:
#   src/seed/seed.ts        # читает packages/seed-data, пишет только в свою базу через repository, upsert по фиксированному id
#   src/seed/bootstrap.ts   # prod-минимум (у identity — суперадминистратор, у content — настройки по умолчанию)
#   src/migrate.ts, src/seed.ts   # точки входа одноразовых задач: node dist/migrate.js, node dist/seed.js --profile small|large

packages/
├── contracts/
│   ├── http/                            # zod-схемы запросов и ответов /v1/*
│   └── events/<context>/<event>.v1.ts   # identity.user.restricted, content.article.published, discussion.comment.created, …
├── seed-data/                           # FR-127–FR-131: данные, а не правила — генераторы без доступа к БД
│   └── src/{ids.ts,anchor.ts,prng.ts,participants.ts,topics.ts,articles.ts,comments.ts,reactions.ts,…,profiles/{small,large}.ts,coverage.ts}
├── logger/  config/  errors/  telemetry/
```

**Structure Decision**: Репозиторий ещё без приложения, поэтому фича заводит `apps/web` и слои FSD вместе с сервисами. Колонки живут в `widgets/shell`, подключённом один раз в layout-маршруте `app/routes/ShellLayout.tsx`; страницы `pages/*` отдают только центр через `<Outlet/>` и остаются дочерними маршрутами каркаса. Шапка принимает центр шапки и меню аватара через слоты, второй шапки нет. Профиль — два компонента центра в `widgets/profile-card`. Серверная часть разложена по владельцам данных: кто пишет таблицу, тот её и читает, остальные получают копии по событиям. Таблицы реакции, закладки, просмотренного и репутации живут в базе `discussion`; подписка, продвижение и отбор ленты — в базе `content`, где лежат статьи и темы. `gateway` не содержит бизнес-логики: проверка сессии, маршрутизация, поток событий и ответ роботам — его единственные обязанности. Общий код между сервисами — только контракты, инфраструктурные пакеты и `packages/seed-data`. Всё, что касается запуска, лежит в `infra/` (FR-123): общего `docker-compose.yml` в корне и `docker/` нет. Клиент отдаёт собственный контейнер со статикой (FR-126), `gateway` статику не раздаёт. Seed разложен по владельцам данных так же, как и таблицы: каждый сервис заполняет только свою базу, согласованность между базами держат общие фиксированные идентификаторы из `packages/seed-data`, а не вызовы между сервисами. Тестовый вход — отдельный контейнер `infra/mock-google`, который не входит ни в один сервис и не линкуется с кодом `identity-service`.

## Complexity Tracking

| Отклонение | Зачем | Почему не проще |
| --- | --- | --- |
| Семь сервисов и шесть баз для одной площадки | Решение сессии уточнений 2026-10-08: владелец хочет границы по bounded context с первого дня | Один сервис был предложен и отклонён владельцем; правило допускает любое число сервисов, если каждый проходит критерии границы |
| `gateway` держит SSE и ответ роботам, хотя это два разных профиля нагрузки | Единственный вход для cookie-сессии и единственное место, знающее права зрителя на поток | Отдельный `realtime-service` потребовал бы второй проверки сессии; выделяется, когда профиль нагрузки SSE потребует отдельного масштабирования |
| Один общий `infra/docker/service.Dockerfile` вместо `Dockerfile` в каждом сервисе | FR-123: описания контейнеров живут в `infra/`; правило `node-microservices.mdc` называет `Dockerfile` в папке сервиса | Семь копий одного multi-stage файла разойдутся; параметр `SERVICE` оставляет независимые образы и откат по сервису |
| Пять сервисов получают модуль `seed`, и ещё есть `packages/seed-data` | FR-127: данные во всех сервисах с согласованными ссылками; правило запрещает писать в чужую базу и держать бизнес-логику в `packages/*` | Один скрипт, пишущий во все базы, нарушил бы database-per-service. `seed-data` содержит только детерминированные записи и их производные числа, правила видимости и подсчёта остаются у сервисов; согласованность проверяет тест |
| `mock-google` — восьмой контейнер сверх списка сервисов | FR-132: войти под seed-участником при входе только через Google | Обходной эндпоинт в `identity-service` под флагом запрещён спецификацией; подмена Google на уровне адреса издателя оставляет код входа единым |
| В `prod` нет обратного прокси, мониторинга, Redis и резервных копий | FR-126 вывел их из объёма | Не отклонение от спецификации, а ограничение: `prod` на этом объёме сам не ставит TLS и не делает бэкапы — это договорённости с внешним входом (см. [environments.md](./contracts/environments.md)) |

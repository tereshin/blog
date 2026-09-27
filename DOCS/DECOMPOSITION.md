# Декомпозиция задач
## Blog Platform — MVP

Документ основан на [`TASK.md`](./TASK.md). Номера в скобках (§N) ссылаются на разделы ТЗ.

**Оценки:** `S` — до 1 дня, `M` — 2–3 дня, `L` — 4–5 дней одного разработчика. Задачи больше `L` дробятся дальше.

**Нотация ID:** `E{эпик}-{номер}`. Колонка «Зависит от» содержит ID задач, которые должны быть завершены раньше.

**Общий Definition of Done для каждой задачи:**

- код в monorepo, проходит lint, typecheck и тесты в CI;
- для backend: unit-тесты доменной логики, integration-тесты через testcontainers там, где есть БД, брокер или Redis;
- для frontend: все строки через i18n-ключи во всех трёх каталогах (`en`, `sr-Latn`, `ru`), экран проверен в светлой и тёмной теме;
- контракты API и событий описаны в `packages/contracts`;
- миграции БД с rollback.

---

# Milestones

```text
M0  Foundation            E0 Monorepo, E1 Shared packages
M1  Identity & Shell      E2 Gateway, E3 Users, E4 i18n, E5 Themes, E6 Web shell
M2  Content               E7 Categories, E8 Media, E9 Content, E10 Editor.js,
                          E11 Autosave/Preview, E12 Realtime
M3  Social & Engagement   E13 Engagement, E14 Feed, E15 Subscriptions,
                          E16 Comments, E21 Profile
M4  Messaging & Notify    E17 Messaging, E18 Notifications
M5  Admin & Moderation    E19 Admin panel, E20 Moderation
M6  Hardening & Release   E22 SEO/SSR, E23 Quality & Release
```

Критический путь:

```text
E0 → E1 → E2 → E3 → E9 → E12 → E13 → E14 → E16 → E17 → E23
               E4, E5 → E6 → E10 → E11 ─┘
               E5 → E19 (каркас админки параллельно M2–M3) → E20
```

E3 (i18n) и E4 (темы) закладываются в M1 до начала массовой вёрстки экранов: переводы и semantic tokens дёшево внедрять сразу и дорого добавлять потом.

---

# E0. Monorepo и инфраструктура разработки (§46, §47)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E0-1 | Инициализация monorepo | pnpm workspaces, Turborepo, структура `apps/*`, `packages/*` | S | — |
| E0-2 | `packages/tsconfig`, `packages/eslint-config` | Общие конфиги TS strict, ESLint, Prettier | S | E0-1 |
| E0-3 | `packages/config` | Типизированная загрузка env с валидацией (zod), падение на старте при ошибке | S | E0-1 |
| E0-4 | `packages/logger` | Structured JSON logger (pino), `requestId`/`correlationId` в контексте | S | E0-1 |
| E0-5 | `docker-compose.yml` для local | PostgreSQL 18, Redis 8, RabbitMQ 4.3, MinIO, init-скрипты schemas | M | E0-1 |
| E0-6 | Шаблон NestJS-сервиса | Fastify adapter, health endpoints, logger, config, graceful shutdown, Dockerfile | M | E0-3, E0-4 |
| E0-7 | CI pipeline | lint, typecheck, test, build affected-пакетов через Turborepo, сборка Docker-образов | M | E0-2 |
| E0-8 | Local DNS для поддоменов | `<domain>.localhost` и `admin.<domain>.localhost` через Traefik в compose | S | E0-5 |

# E1. Общие backend-пакеты (§22, §23, §24, §44)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E1-1 | `packages/database` | Клиент PostgreSQL (Drizzle или Prisma), миграции per-schema, транзакции | M | E0-6 |
| E1-2 | `packages/contracts` | Структура DTO, event envelope (`eventId`, `correlationId`, `causationId`, `eventVersion`), формат ошибок `{ code, params }` | M | E0-1 |
| E1-3 | `packages/rabbitmq` | Publisher confirms, consumer с manual ACK, retry с exponential backoff, DLQ, idempotency-хелпер | L | E0-6, E1-2 |
| E1-4 | Transactional Outbox | Таблица `outbox_events`, хелпер записи в транзакции, outbox relay worker | L | E1-1, E1-3 |
| E1-5 | `packages/redis` | Клиент, distributed lock, rate limiter (sliding window), cache-хелперы | M | E0-6 |
| E1-6 | `packages/firebase` | Admin SDK init, `verifyIdToken`, проверка MFA claim | S | E0-3 |
| E1-7 | Observability baseline | OpenTelemetry tracing, Prometheus metrics endpoint, Sentry | M | E0-6 |

# E2. API Gateway и аутентификация (§6.1, §33, §34)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E2-1 | Каркас API Gateway | Маршрутизация `/api/v1/*` в сервисы, `x-request-id`, CORS | M | E0-6 |
| E2-2 | Firebase auth guard | Проверка ID token, опциональная auth для публичных endpoints | M | E1-6, E2-1 |
| E2-3 | Firebase UID → internal UUID | Вызов User Service, кеш в Redis, автосоздание пользователя при первом запросе | M | E2-2, E3-2 |
| E2-4 | Rate limiting | Лимиты per-user и per-IP из §36, конфигурация без релиза | M | E1-5, E2-1 |
| E2-5 | Определение локали запроса | Разбор `X-Locale`/`Accept-Language` → `sr-Latn`/`ru`/`en`, проброс в сервисы | S | E2-1, E4-1 |
| E2-6 | Admin API контур | `/api/v1/admin/*`: CORS только для `admin.<domain>`, RBAC guard по роли из User Service, проверка MFA, отдельные rate limits | M | E2-3 |
| E2-7 | Audit middleware | Для изменяющих admin-запросов собирает actor, ip, user agent, request id и передаёт в сервис | S | E2-6, E19-1 |

# E3. User Service (§6.2)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E3-1 | Схема `users` | Таблицы `users`, `user_settings` (включая `locale`, `theme`, `content_languages`), индексы | S | E1-1 |
| E3-2 | Создание пользователя по Firebase UID | Идемпотентное создание, внутренний UUID, событие `user.created` | M | E3-1, E1-4 |
| E3-3 | Onboarding username | Проверка уникальности, зарезервированные имена (`admin`, `api`, `en`, `sr`, `ru`…), валидация | M | E3-2 |
| E3-4 | Профиль CRUD | display name, bio, external links; avatar и cover подключаются после E8-2 | M | E3-2 |
| E3-5 | Настройки пользователя | `GET/PATCH /me/settings`: приватность, уведомления, `locale`, `theme`, `content_languages` | S | E3-1 |
| E3-6 | Роли и статусы | `role`, `status`, внутренний API для RBAC и блокировок | S | E3-1 |

# E4. Локализация — фундамент (§63)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E4-1 | `packages/i18n` | Список локалей, маппинг URL-сегмента `sr` ↔ `sr-Latn`, fallback `en`, типы | S | E0-1 |
| E4-2 | Каталоги сообщений | `messages/{en,sr-Latn,ru}.json` с namespaces, ICU MessageFormat, типизированные ключи | M | E4-1 |
| E4-3 | CI-проверка каталогов | Скрипт: одинаковый набор ключей и ICU-плейсхолдеров во всех локалях, падение CI | S | E4-2, E0-7 |
| E4-4 | Форматтеры | Обёртки над `Intl` для дат, relative time, compact-чисел; unit-тесты plural-форм `ru`/`sr-Latn` | M | E4-1 |
| E4-5 | Транслитерация slug | `ru` кириллица → латиница, `č ć š ž đ` → `c c s z dj`, unit-тесты | S | E4-1 |
| E4-6 | Коды ошибок | Реестр кодов ошибок в `packages/contracts`, переводы в namespace `errors` | S | E1-2, E4-2 |
| E4-7 | Процесс перевода | Инструкция для переводчиков, владелец каждой локали, ревью переводов в PR | S | E4-2 |

# E5. Темы — фундамент (§62)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E5-1 | `packages/ui` и HeroUI v3 | Tailwind v4, HeroUI theme config, светлая и тёмная палитры на semantic tokens | M | E0-1 |
| E5-2 | ESLint-правило против hardcoded цветов | Запрет произвольных цветов Tailwind и hex в компонентах, только tokens | S | E5-1, E0-2 |
| E5-3 | Theme provider | Режимы `light/dark/system`, cookie `theme` на `.<domain>`, подписка на `prefers-color-scheme` | M | E5-1 |
| E5-4 | Синхронизация с профилем | Чтение и запись `user_settings.theme`, приоритеты из §62.3 | S | E5-3, E3-5 |
| E5-5 | Контраст и доступность | axe-core проверка обеих тем в CI, фиксы палитры до WCAG AA | M | E5-1 |

# E6. Web shell — публичный сайт (§27, §28)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E6-1 | Next.js app | App Router, FSD-структура (`app/entities/features/widgets/shared`), TanStack Query, Zustand | M | E5-1 |
| E6-2 | Locale routing | next-intl, сегмент `/:locale`, middleware определения языка (§63.3), redirect с `/` | M | E6-1, E4-2 |
| E6-3 | SSR темы без вспышки | Класс темы из cookie на `<html>`, inline script для `system`, `color-scheme` и `theme-color` | M | E6-1, E5-3 |
| E6-4 | Layout и header | Навигация, лента-табы, переключатели языка и темы, аватар / кнопка входа | M | E6-2, E6-3 |
| E6-5 | Firebase Auth modal | email/password, Google, verification, recovery; `auth.languageCode` = текущая локаль | L | E6-4, E2-3 |
| E6-6 | API client | Fetch-обёртка с токеном, `X-Locale`, перевод ошибок по коду, retry | M | E6-1, E4-6 |
| E6-7 | Onboarding username | Экран выбора username после первого входа | S | E6-5, E3-3 |
| E6-8 | Redirect `/admin` | `301` на `https://admin.<domain>` | S | E6-2 |
| E6-9 | Шрифты | Подмножества `latin`, `latin-ext`, `cyrillic`, проверка сербских диакритик | S | E6-1 |

# E7. Category Service (§10)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E7-1 | Схема | `categories`, `category_translations`, индексы | S | E1-1 |
| E7-2 | Публичный API | Список и карточка категории с переводом по локали запроса, fallback `en` | M | E7-1, E2-5 |
| E7-3 | Admin API категорий | CRUD, переводы per locale, порядок, статус, аудит | M | E7-1, E2-6 |
| E7-4 | Счётчики | `articles_count`, `followers_count` по событиям | S | E7-1, E1-3 |
| E7-5 | Страница категории | `/:locale/category/:slug`: cover, описание, табы «Популярное/Свежее» | M | E7-2, E6-4, E14-1 |

# E8. Media Service (§11)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E8-1 | Presigned upload | `POST /media/upload-url`, лимиты размера и MIME, S3/MinIO | M | E0-6 |
| E8-2 | Complete upload | `POST /media/{id}/complete`, событие `media.uploaded` через outbox | S | E8-1, E1-4 |
| E8-3 | Media worker | Метаданные, ресайз, thumbnails, WebP/AVIF | L | E8-2 |
| E8-4 | Безопасность файлов | Malware scan, запрет активного SVG, moderation hooks | M | E8-3 |

# E9. Content Service (§6.3, §8, §35)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E9-1 | Схема | `articles` (включая `language`), `article_revisions`, индексы из §43 | S | E1-1 |
| E9-2 | CRUD черновиков | Создание, чтение, удаление; `language` по умолчанию = локаль автора | M | E9-1, E2-3 |
| E9-3 | Валидация блоков | Серверная схема каждого блока Editor.js, allowlist типов | L | E9-1 |
| E9-4 | Sanitize и HTML renderer | Sanitize, allowlist протоколов и embed-доменов, рендер в `rendered_html` с поддержкой тем | L | E9-3 |
| E9-5 | Публикация | `POST /articles/:id/publish`, revision, slug через транслитерацию, событие `article.published` | M | E9-4, E4-5, E1-4 |
| E9-6 | Редактирование опубликованной | Новая revision, `article.updated` | M | E9-5 |
| E9-7 | Статусы | `UNLISTED`, `ARCHIVED`, soft delete | S | E9-5 |
| E9-8 | Admin-операции | Hide/restore, смена категории, события `moderation.article.*` | M | E9-5, E2-6 |

# E10. Editor.js на frontend (§7)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E10-1 | Интеграция Editor.js | Страница `/:locale/write/:id`, базовые блоки, allowlist плагинов | L | E6-4, E9-2 |
| E10-2 | Локализация Editor.js | Параметр `i18n` для toolbox, tunes, inline tools на трёх языках | M | E10-1, E4-2 |
| E10-3 | Темы Editor.js | Стили toolbar, popover, блоков в светлой и тёмной теме | M | E10-1, E5-1 |
| E10-4 | Медиа-блоки | image, gallery, attachments через Media Service | M | E10-1, E8-2 |
| E10-5 | Embeds | YouTube, Vimeo, X, Telegram (custom), link preview; параметр темы | L | E10-1 |
| E10-6 | Custom tools | underline, strike, spoiler, CTA, anchor, mention, audio | L | E10-1 |
| E10-7 | Экран публикации | Выбор категории, языка статьи, cover, subtitle, SEO-полей | M | E10-1, E7-2 |

# E11. Autosave и live preview (§9)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E11-1 | Autosave API | Block-level patch, optimistic locking, `409 ARTICLE_VERSION_CONFLICT` | M | E9-2 |
| E11-2 | Autosave на клиенте | IndexedDB, debounce, статус «Сохранено» (локализован), разрешение конфликта | M | E11-1, E10-1 |
| E11-3 | Live preview | Room `draft:{id}`, `editor:block:update`, страница `/:locale/preview/:id` | M | E12-1, E10-1 |
| E11-4 | Уведомление об обновлении статьи | `article:updated`, баннер «Материал обновлён» без подмены текста | S | E12-1, E9-6 |

# E12. Realtime Gateway (§21)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E12-1 | Каркас Socket.IO | Namespaces, auth по Firebase token в handshake, room `user:{id}`, `protocolVersion` | L | E1-6, E2-3 |
| E12-2 | Redis adapter | Горизонтальное масштабирование, sticky sessions для polling | M | E12-1, E1-5 |
| E12-3 | Мост RabbitMQ → Socket | Consumers доменных событий, маршрутизация в rooms | M | E12-1, E1-3 |
| E12-4 | Клиентский слой | Socket client в `shared`, переподключение, подписка на rooms, интеграция с TanStack Query cache | M | E12-1, E6-6 |

# E13. Engagement Service (§12–§14, §18)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E13-1 | Лайки | `PUT/DELETE /articles/:id/like`, unique, outbox-события | M | E1-4, E9-5 |
| E13-2 | Просмотры | Dedupe-ключ в Redis, anonymous session ID, `INCR`, flush worker в PostgreSQL | L | E1-5, E9-5 |
| E13-3 | Закладки | `PUT/DELETE /articles/:id/bookmark`, `GET /me/bookmarks` с cursor pagination | M | E1-4 |
| E13-4 | Агрегированные stats | `article:stats` с throttling 1–3 с | M | E13-1, E13-2, E12-3 |
| E13-5 | UI engagement | Кнопки лайка и закладки с optimistic update и rollback, compact-счётчики по локали | M | E13-4, E12-4, E4-4 |

# E14. Feed Service (§17, §55)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E14-1 | Fresh feed | Cursor pagination, фильтр по категории и по `content_languages` | M | E9-5 |
| E14-2 | Popular feed | Scoring из §55, коэффициенты в конфиге, пересчёт по событиям | L | E14-1, E13-4 |
| E14-3 | My Feed | Fan-out on read: подписки на авторов и категории | M | E14-1, E15-1 |
| E14-4 | Redis cache | `feed:*` ключи, TTL, event-driven invalidation | M | E14-1, E1-5 |
| E14-5 | UI лент | `/:locale`, `/fresh`, `/popular`, `/feed`, карточка статьи, skeleton, infinite scroll; даты через relative time | L | E14-1, E6-4 |
| E14-6 | Фильтр языков контента | Настройка «Языки публикаций» в settings, применение в лентах | S | E14-1, E3-5 |

# E15. Subscription Service (§16)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E15-1 | Подписки | `user_follows`, `category_follows`, API, события `*.followed/unfollowed` | M | E1-4 |
| E15-2 | Счётчики подписчиков | Eventual consistency через события | S | E15-1 |
| E15-3 | UI подписок | Кнопки на профиле и категории, списки подписчиков и подписок | M | E15-1, E6-4 |

# E16. Comment Service (§15)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E16-1 | Схема и CRUD | `comments`, дерево через `parent_id`/`root_id`/`depth`, soft delete | M | E1-1 |
| E16-2 | Лайки комментариев | `PUT/DELETE /comments/:id/like` | S | E16-1 |
| E16-3 | Mentions | Разбор `@username`, событие для Notification Service | M | E16-1 |
| E16-4 | Realtime | `comment:created/updated/deleted/liked` в room статьи | M | E16-1, E12-3 |
| E16-5 | UI комментариев | Дерево до 3 уровней, flattening глубже, формы, plural «N комментариев» | L | E16-4, E12-4 |
| E16-6 | Admin-операции | Hide/restore, событие `moderation.comment.hidden`, удаление у открытых клиентов | S | E16-1, E2-6 |

# E17. Messaging Service (§19, §20)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E17-1 | Схема | `conversations`, `conversation_members`, `messages`, `message_attachments` | S | E1-1 |
| E17-2 | Диалоги и сообщения API | Создание диалога 1:1, отправка с `clientMessageId`, edit, soft delete, cursor pagination | L | E17-1, E1-4 |
| E17-3 | Realtime | send/created/updated/deleted, typing, read receipts, online/offline (presence в Redis) | L | E17-2, E12-3 |
| E17-4 | Unread counters | Счётчики непрочитанных, выдача при подключении | M | E17-3 |
| E17-5 | Блокировки и приватность | `allow_messages`, блокировка пользователя | S | E17-2, E3-5 |
| E17-6 | UI сообщений | Список диалогов, чат, optimistic send, typing, вложения | L | E17-3, E12-4 |

# E18. Notification Service (§25)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E18-1 | Схема и consumers | `notifications`, генерация по событиям: ответ, mention, подписчик, сообщение | M | E1-3 |
| E18-2 | Realtime | `notification:new/read` | S | E18-1, E12-3 |
| E18-3 | Локализованный рендер на клиенте | Шаблоны по `type` + `payload` в namespace `notifications` на трёх языках | M | E18-2, E4-2 |
| E18-4 | Email-шаблоны | Шаблоны в трёх языках, выбор по `user_settings.locale`, светлая и тёмная совместимость в почтовых клиентах | M | E18-1, E4-2 |
| E18-5 | Firebase email actions | Проверка поддержки `sr-Latn` в Firebase; при необходимости собственный action handler с локализованными письмами | M | E6-5, E18-4 |

# E19. Админ-панель на поддомене (§61)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E19-1 | Журнал аудита | Таблица `admin_audit_log`, append-only права, запись из сервисов | M | E1-1 |
| E19-2 | Каркас `apps/admin` | Vite + React + React Router + TanStack Query/Table + HeroUI из `packages/ui` | M | E5-1 |
| E19-3 | Deploy на поддомене | Отдельный образ, Nginx, `admin.<domain>`, CSP и security headers, `noindex`, robots `Disallow: /` | M | E19-2, E0-8 |
| E19-4 | i18n и темы в админке | use-intl с общими каталогами (namespace `admin`), theme provider из `packages/ui` | S | E19-2, E4-2, E5-3 |
| E19-5 | Вход и MFA | Firebase login, обязательная MFA для ролей, `GET /admin/me`, экран «Нет доступа», idle timeout | L | E19-2, E2-6 |
| E19-6 | Layout и навигация по ролям | Sidebar с пунктами по роли, header с переключателями языка и темы | M | E19-5 |
| E19-7 | Dashboard | Ключевые метрики и состояние сервисов | M | E19-6, E23-2 |
| E19-8 | Users | Список, фильтры, карточка, блокировка, назначение ролей (только ADMIN) | L | E19-6, E3-6 |
| E19-9 | Articles | Список, фильтры по статусу, категории, языку; hide/restore, смена категории | M | E19-6, E9-8 |
| E19-10 | Comments | Список, hide/restore | M | E19-6, E16-6 |
| E19-11 | Categories | CRUD, редактор переводов по трём языкам с подсветкой пустых | M | E19-6, E7-3 |
| E19-12 | Settings | Коэффициенты Popular feed, rate limits, embed allowlist | M | E19-6, E14-2, E2-4 |
| E19-13 | Audit log UI | Список с фильтрами, diff `before/after` | M | E19-6, E19-1 |

# E20. Модерация и anti-spam (§37)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E20-1 | Жалобы | `reports`, API подачи жалобы, UI «Пожаловаться» на статье, комментарии, профиле | M | E1-1, E6-4 |
| E20-2 | Reports в админке | Очередь, фильтры, взятие в работу, решение с обязательной причиной | M | E20-1, E19-6 |
| E20-3 | Anti-spam правила | Возраст аккаунта, дубли контента, лимит ссылок, повторные комментарии | L | E16-1, E9-5 |
| E20-4 | Блокировка пользователя | Эффект блокировки во всех сервисах через событие `moderation.user.blocked` | M | E3-6, E1-3 |

# E21. Профиль и настройки (§26)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E21-1 | Страница профиля | `/:locale/@username`: табы Posts / Comments, счётчики, Subscribe, Message | L | E3-4, E15-3 |
| E21-2 | Собственный профиль | Drafts, Bookmarks | M | E21-1, E13-3 |
| E21-3 | Settings | `/settings/profile`, `/settings/account`, `/settings/appearance` (тема, язык интерфейса, языки контента) | M | E3-5, E5-4, E14-6 |

# E22. SEO, SSR и кеш (§39, §40)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E22-1 | SSR страницы статьи | `rendered_html`, `lang` контейнера = `articles.language`, стили в обеих темах | M | E9-5, E6-3 |
| E22-2 | Meta и JSON-LD | title, description, OG, Twitter Cards, Article (`inLanguage`), BreadcrumbList, Person | M | E22-1 |
| E22-3 | hreflang и canonical | Alternate для локализованных страниц, canonical статьи на локаль контента | M | E22-1, E6-2 |
| E22-4 | Sitemap и robots | Sitemaps из §39 с `xhtml:link` alternates, robots.txt; noindex для draft/preview | M | E22-3 |
| E22-5 | Кеш статей | `article:{slug}`, invalidation по событиям, CDN без персональных данных; cookie темы и языка не ломают shared cache | M | E22-1, E1-5 |

# E23. Качество, эксплуатация и релиз (§44, §45, §48–§52)

| ID | Задача | Результат | Оценка | Зависит от |
|---|---|---|---|---|
| E23-1 | Мониторинг | Grafana dashboards, Loki, алерты по SLO из §49 | M | E1-7 |
| E23-2 | Health aggregation | `/health/live`, `/health/ready` во всех сервисах, агрегатор для dashboard админки | S | E0-6 |
| E23-3 | E2E сценарии | Playwright: публикация → лайк → комментарий; сообщения; модерация через админку | L | E16-5, E17-6, E20-2 |
| E23-4 | Visual regression | Матрица `{light, dark} × {en, sr-Latn, ru}` для ключевых страниц web и admin | M | E23-3 |
| E23-5 | Нагрузочное тестирование | k6: API p95, socket propagation, feed | L | E14-2, E12-2 |
| E23-6 | Backups | PostgreSQL daily + WAL/PITR, S3 versioning, проверка восстановления | M | E0-5 |
| E23-7 | Production deploy | Окружения stage/prod, TLS для `<domain>` и `admin.<domain>`, секреты, миграции в pipeline | L | E23-1, E19-3 |
| E23-8 | Проверка DoD MVP | Прогон всех 28 шагов §60 на stage | M | все эпики |

---

# Порядок работы по milestones

## M0 — Foundation (≈ 2 недели)

E0-1…E0-8, E1-1…E1-7. Результат: сервис-шаблон поднимается в compose, событие проходит через outbox → RabbitMQ → consumer, CI зелёный.

## M1 — Identity & Shell (≈ 3 недели)

E2-1…E2-5, E3-*, E4-*, E5-*, E6-*. Результат: пользователь заходит через Firebase, выбирает username, переключает язык и тему, выбор сохраняется. Все следующие экраны строятся уже на i18n-ключах и semantic tokens.

## M2 — Content (≈ 4 недели)

E7-1, E7-2, E7-4, E8-*, E9-1…E9-7, E10-*, E11-*, E12-*. Результат: статья создаётся в Editor.js на любом из трёх языков интерфейса, autosave, live preview, публикация, SSR-страница.

## M3 — Social & Engagement (≈ 3 недели)

E13-*, E14-*, E15-*, E16-1…E16-5, E7-5, E21-*. Результат: ленты, лайки, просмотры, закладки, подписки, комментарии в real-time.

## M4 — Messaging & Notifications (≈ 2–3 недели)

E17-*, E18-*. Результат: личные сообщения, уведомления и письма на языке пользователя.

## M5 — Admin & Moderation (≈ 3 недели)

E2-6, E2-7, E7-3, E9-8, E16-6, E19-*, E20-*. Каркас админки (E19-1…E19-6) можно начинать параллельно с M2–M3 отдельным разработчиком. Результат: модератор и администратор работают через `admin.<domain>` с MFA и аудитом.

## M6 — Hardening & Release (≈ 2–3 недели)

E22-*, E23-*. Результат: пройдены все шаги DoD MVP, SEO и мониторинг настроены, production deploy.

Суммарно ориентировочно 19–21 неделя для команды из 3–4 разработчиков (2 backend, 1–2 frontend) при параллельной работе по эпикам.

---

# Открытые вопросы

1. Firebase MFA: нужен план Identity Platform (upgrade Firebase Auth) — подтвердить бюджет.
2. Нужна ли IP allowlist / VPN для `admin.<domain>` или достаточно MFA.
3. Кто отвечает за переводы `sr-Latn` и `ru`: штатные сотрудники или агентство; SLA на перевод новых строк.
4. Язык по умолчанию для новых посетителей без `Accept-Language` — `en` (принято в ТЗ) или `sr-Latn`, если основной рынок — Сербия.
5. Нужны ли автоматические переводы пользовательского контента в будущем (Phase 2).

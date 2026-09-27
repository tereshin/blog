# Техническое задание
## Блог-платформа с микросервисной архитектурой

**Рабочее название:** Blog Platform  
**Тип продукта:** UGC / publishing / social blogging platform  
**Референс по продуктовой модели:** vc.ru  
**Архитектура:** microservices + event-driven  
**Основной стек:** Node.js, TypeScript, React, HeroUI, PostgreSQL, Redis, RabbitMQ, Socket.IO, Firebase Authentication, Docker.  
**Клиентские приложения:** публичный сайт (Next.js) и отдельная админ-панель на поддомене `admin.<domain>`.  
**Темы оформления:** светлая, тёмная, системная.  
**Языки интерфейса:** English (`en`), Srpski latinica (`sr-Latn`), Русский (`ru`).

---

# 1. Цель проекта

Разработать масштабируемую блог-платформу, в которой пользователи могут:

- создавать и редактировать статьи;
- публиковать статьи в тематических категориях;
- читать персональную и общую ленту;
- подписываться на категории;
- подписываться на авторов;
- ставить лайки;
- комментировать публикации;
- видеть счётчики лайков, комментариев и просмотров в real-time;
- добавлять публикации в закладки;
- отправлять другим пользователям личные сообщения;
- получать обновления интерфейса через WebSocket без перезагрузки страницы;
- переключать светлую и тёмную тему интерфейса;
- пользоваться интерфейсом на английском, сербском (латиница) или русском языке.

Модераторы и администраторы управляют платформой через отдельную админ-панель на поддомене `admin.<domain>`.

В качестве продуктового ориентира используется vc.ru, но визуальный дизайн, код, тексты и бренд vc.ru не копируются.

---

# 2. Анализ продуктовой модели vc.ru

На текущей публичной версии vc.ru присутствуют три ключевых режима ленты:

- «Популярное»;
- «Свежее»;
- «Моя лента».

Кроме них, глобальная навигация содержит раздел «Сообщения», а контент организован по тематическим сообществам — например, AI, Разработка, Маркетинг, Деньги и т.д.

Страница сообщества содержит описание, количество подписчиков, публикации и комментарии. Например, публичная страница «Разработка» показывает название, slug `@dev`, описание сообщества и число подписчиков.

В ленте рядом с публикациями отображаются показатели вовлечения и просмотров, что формирует social-feedback loop: пользователь сразу видит активность вокруг материала.

Публичная документация vc.ru также подтверждает блочную модель редактора: материал состоит из отдельных блоков — текст, заголовки, изображения, видео, цитаты и т.д. Пользователь выбирает тему публикации, а опубликованная в тематическом разделе статья одновременно относится к авторскому блогу.

Для проектируемой системы принимается аналогичная доменная модель:

**User → Article → Category → Engagement → Social Graph → Feed → Messaging.**

---

# 3. Основные роли

## 3.1 Guest

Неавторизованный пользователь.

Разрешено:

- читать опубликованные статьи;
- открывать категории;
- открывать публичные профили;
- смотреть комментарии;
- видеть количество просмотров, лайков и комментариев;
- использовать публичную ленту.

Запрещено:

- лайки;
- комментарии;
- подписки;
- закладки;
- написание статей;
- сообщения.

При попытке выполнить защищённое действие показывается Firebase Auth modal.

## 3.2 User / Author

После регистрации пользователь одновременно является читателем и потенциальным автором.

Доступно:

- создание публикаций;
- профиль;
- подписки;
- лайки;
- комментарии;
- закладки;
- личные сообщения.

Отдельную роль `AUTHOR` создавать не требуется.

## 3.3 Moderator

Доступно:

- скрытие статьи;
- скрытие комментария;
- блокировка пользователя;
- работа с жалобами;
- изменение категории публикации.

Все действия модератора выполняются в админ-панели (`admin.<domain>`), см. раздел «Админ-панель».

## 3.4 Administrator

Полный доступ:

- категории;
- пользователи;
- модерация;
- настройки;
- системная статистика;
- назначение ролей;
- журнал аудита.

Все действия администратора выполняются в админ-панели (`admin.<domain>`). В публичном веб-приложении административных экранов нет.

---

# 4. Технологический стек

## Backend

- Node.js 24 LTS;
- TypeScript;
- NestJS;
- Fastify adapter;
- PostgreSQL;
- Redis;
- RabbitMQ;
- Socket.IO;
- Firebase Admin SDK.

На сентябрь 2026 года Node.js 24 находится в LTS, тогда как Node.js 26 ещё имеет статус Current, поэтому production baseline рекомендуется строить на Node.js 24.

## Frontend

- React;
- Next.js;
- TypeScript;
- HeroUI;
- TanStack Query;
- Zustand;
- Editor.js;
- Socket.IO Client;
- next-intl — локализация публичного сайта;
- ICU MessageFormat — формат переводов.

Next.js используется прежде всего из-за SSR/SEO публичных публикаций.

## Admin panel

- React;
- Vite (SPA);
- React Router;
- TypeScript;
- HeroUI;
- TanStack Query;
- TanStack Table;
- use-intl — то же ядро, что у next-intl, общие каталоги переводов.

Админ-панели не нужны SSR и SEO, поэтому она собирается как статический SPA и раздаётся отдельно от публичного сайта.

URL статьи должен нормально индексироваться поисковыми системами и возвращать готовый HTML без необходимости выполнения JavaScript.

## Database

PostgreSQL 18.

На момент подготовки ТЗ PostgreSQL 18 является текущей стабильной веткой, тогда как PostgreSQL 19 находится в beta и не рекомендуется PostgreSQL Project для production.

## Cache / realtime infrastructure

Redis 8.x.

Используется для:

- cache;
- distributed locks;
- counters;
- sessions;
- presence;
- rate limiting;
- feed cache;
- Socket.IO adapter;
- temporary realtime state.

Redis 8 является текущей основной веткой Redis Open Source.

## Message broker

RabbitMQ 4.3.

RabbitMQ используется исключительно для durable asynchronous domain events, а не вместо WebSocket.

Текущая ветка 4.3 имеет community support и является подходящей production-базой.

## Authentication

Firebase Authentication:

- email/password;
- Google;
- GitHub — опционально;
- Apple — опционально;
- email verification;
- password recovery.

Frontend получает Firebase ID Token и передаёт его backend.

API Gateway проверяет ID Token через Firebase Admin SDK. Это соответствует рекомендуемой Firebase модели: клиент получает JWT, backend самостоятельно проверяет его через Admin SDK.

## Infrastructure

- Docker;
- Docker Compose для local/stage;
- Nginx или Traefik;
- S3-compatible object storage;
- MinIO в development;
- S3/R2/MinIO в production.

Object Storage является обязательной дополнительной зависимостью, поскольку хранить изображения и видео непосредственно в PostgreSQL нельзя.

---

# 5. Общая архитектура

```text
   ┌────────────────────────┐        ┌────────────────────────┐
   │  <domain>              │        │  admin.<domain>        │
   │  React / Next.js       │        │  React / Vite SPA      │
   │  HeroUI                │        │  HeroUI                │
   └───────────┬────────────┘        └───────────┬────────────┘
               │ HTTPS / WS                      │ HTTPS
               └────────────────┬────────────────┘
                                │
                    ┌──────────────▼──────────────┐
                    │       API Gateway / BFF     │
                    │ Firebase Auth verification  │
                    └──────┬──────────┬───────────┘
                           │          │
             ┌─────────────┘          └──────────────┐
             │                                        │
     ┌───────▼───────┐                       ┌────────▼───────┐
     │ REST services │                       │ Realtime       │
     │               │                       │ Gateway        │
     └───────┬───────┘                       │ Socket.IO      │
             │                               └────────┬───────┘
             │                                        │
             ├──────────── PostgreSQL                  │
             │                                        │
             ├──────────── Redis ──────────────────────┘
             │
             └──────────── RabbitMQ
                              │
                        Domain Events
```

---

# 6. Микросервисы

## 6.1 API Gateway / BFF

Ответственность:

- единая точка входа;
- Firebase token validation;
- authorization;
- rate limits;
- request ID;
- API aggregation;
- маршрутизация;
- пользовательский context;
- определение локали запроса (`Accept-Language` / `X-Locale`) и передача её в сервисы;
- отдельный контур `/api/v1/admin/*` для админ-панели.

Admin API:

- доступен только с origin `https://admin.<domain>` (CORS allowlist);
- каждый запрос проходит RBAC-проверку роли `MODERATOR` или `ADMIN` по данным User Service, а не по claim из токена;
- требует пройденной Firebase MFA (claim `firebase.sign_in_second_factor`);
- имеет собственные, более строгие rate limits;
- каждое изменяющее действие пишется в журнал аудита.

Backend-сервисы не должны самостоятельно принимать Firebase ID как бизнес-идентификатор.

После проверки Firebase UID преобразуется во внутренний UUID пользователя.

---

# 6.2 User Service

Ответственность:

- профиль пользователя;
- username;
- display name;
- avatar;
- cover;
- bio;
- external links;
- роль;
- настройки приватности;
- статус блокировки;
- связь Firebase UID → internal user UUID.

Основные таблицы:

`users`

- id UUID;
- firebase_uid VARCHAR UNIQUE;
- username VARCHAR UNIQUE;
- display_name;
- bio;
- avatar_media_id;
- cover_media_id;
- role;
- status;
- created_at;
- updated_at.

`user_settings`

- user_id;
- allow_messages;
- email_notifications;
- push_notifications;
- profile_visibility;
- locale ENUM(`en`, `sr-Latn`, `ru`) — язык интерфейса, писем и уведомлений;
- theme ENUM(`light`, `dark`, `system`), по умолчанию `system`;
- content_languages — языки публикаций в лентах; пустое значение означает «все языки».

---

# 6.3 Content Service

Главный сервис публикаций.

Ответственность:

- статьи;
- черновики;
- Editor.js JSON;
- версии;
- публикация;
- редактирование;
- slug;
- SEO;
- привязка категории;
- realtime draft.

Основная таблица:

`articles`

- id UUID;
- author_id UUID;
- category_id UUID;
- slug VARCHAR UNIQUE;
- language ENUM(`en`, `sr-Latn`, `ru`) — язык содержимого статьи;
- title VARCHAR;
- subtitle VARCHAR;
- excerpt TEXT;
- cover_media_id UUID;
- status ENUM;
- content JSONB;
- rendered_html TEXT;
- version INTEGER;
- published_at TIMESTAMP;
- created_at;
- updated_at;
- deleted_at.

Статусы:

- `DRAFT`;
- `PUBLISHED`;
- `UNLISTED`;
- `ARCHIVED`;
- `DELETED`.

Отдельно:

`article_revisions`

- id;
- article_id;
- version;
- content JSONB;
- title;
- created_by;
- created_at.

Редактирование опубликованной статьи не уничтожает предыдущую версию.

---

# 7. Editor.js

Editor.js используется как основной article composer.

Официальный набор Editor.js включает Heading, Quote, Image, Nested List, Checklist, Link, Embed, Table, Delimiter, Warning, Code, Raw HTML, Attachments, Marker и Inline Code.

Поддержать:

- paragraph;
- heading H2-H6;
- bold;
- italic;
- underline custom tool;
- strike custom tool;
- inline link;
- marker;
- inline code;
- ordered list;
- unordered list;
- nested lists;
- checklist;
- quote;
- warning/callout;
- delimiter;
- table;
- code block;
- image;
- gallery;
- video embed;
- YouTube;
- Vimeo;
- X/Twitter embed;
- Telegram embed — custom;
- link preview;
- attachments;
- audio — custom;
- file attachments;
- spoiler — custom;
- poll — custom;
- button/CTA — custom;
- anchor;
- mention user;
- raw HTML — только для trusted/admin users.

Все community plugins подключаются исключительно через внутренний allowlist.

Недопустимо динамически подключать произвольный Editor.js plugin со стороны пользователя.

---

# 8. Формат статьи

Source of truth:

```json
{
  "time": 1780000000000,
  "version": "2.x",
  "blocks": [
    {
      "id": "block-id",
      "type": "header",
      "data": {
        "text": "Example",
        "level": 2
      }
    }
  ]
}
```

Backend обязательно выполняет повторную серверную валидацию каждого блока.

На публикации:

`Editor JSON → validation → sanitize → HTML renderer → rendered_html`

HTML используется для SSR и SEO.

Editor JSON сохраняется независимо и используется при последующем редактировании.

---

# 9. Autosave и realtime статьи

## 9.1 Autosave

Editor.js `onChange` инициирует локальное изменение.

Frontend:

1. сохраняет draft в IndexedDB;
2. debounce 800–1500 ms;
3. отправляет block-level patch;
4. получает server version;
5. отображает статус `Saved`.

Каждый запрос содержит:

```text
articleId
clientVersion
operationId
changedBlocks
```

Backend использует optimistic locking.

Если:

`clientVersion != serverVersion`

возвращается `409 ARTICLE_VERSION_CONFLICT`.

## 9.2 Live preview

Для каждой статьи:

`draft:{articleId}`

создаётся Socket.IO room.

Автор может открыть:

`/write/{id}`

а live preview:

`/preview/{id}`

При изменении блока:

```text
editor:block:update
```

Realtime Gateway передаёт изменение всем авторизованным preview clients.

Целевой latency:

**< 300 ms p95.**

## 9.3 Обновление опубликованной статьи

Если пользователь читает материал, а автор изменил публикацию:

```text
article:updated
```

Frontend показывает:

> Материал обновлён. Показать новую версию.

Не заменять читаемый контент автоматически, чтобы текст не прыгал перед пользователем.

## 9.4 Collaborative editing

Одновременное совместное редактирование несколькими авторами **не входит в MVP**.

Editor.js сам по себе не является CRDT editor.

Если эта функция понадобится, отдельной фазой внедряется:

- Yjs;
- CRDT;
- awareness/presence;
- collaborative cursor.

---

# 10. Category Service

Категория является аналогом тематического сообщества.

Таблица:

`categories`

- id UUID;
- slug;
- icon;
- cover_media_id;
- status;
- articles_count;
- followers_count;
- created_at;
- updated_at.

`category_translations`

- category_id UUID;
- locale ENUM(`en`, `sr-Latn`, `ru`);
- name;
- description;
- UNIQUE(category_id, locale).

Название и описание категории хранятся для всех трёх языков. Если перевода нет, используется `en`. Slug один на все языки.

Страница:

`/{locale}/category/development`

содержит:

- cover;
- название;
- описание;
- «Подписаться»;
- количество подписчиков;
- tabs «Популярное / Свежее»;
- список публикаций.

Категория может модерироваться администратором.

MVP:

одна основная категория у статьи.

В будущем возможно добавить secondary topics/tags.

---

# 11. Media Service

Ответственность:

- изображения;
- видео;
- документы;
- avatar;
- article cover;
- Editor.js uploads.

Использовать S3-compatible storage.

Процесс:

```text
Frontend
   ↓
POST /media/upload-url
   ↓
Media Service
   ↓
presigned S3 URL
   ↓
direct upload
   ↓
POST /media/{id}/complete
```

Приложение не должно проксировать большие файлы через API Gateway.

После загрузки:

RabbitMQ:

```text
media.uploaded
```

Worker выполняет:

- metadata extraction;
- image resizing;
- thumbnail generation;
- WebP/AVIF;
- malware scan для файлов;
- moderation hooks.

---

# 12. Engagement Service

Отвечает за:

- лайки;
- просмотры;
- закладки;
- агрегированные счётчики.

---

# 13. Лайки

Endpoint:

```text
PUT    /articles/:id/like
DELETE /articles/:id/like
```

Таблица:

`article_likes`

- article_id;
- user_id;
- created_at.

Unique:

```text
UNIQUE(article_id, user_id)
```

После изменения:

```text
article.liked
article.unliked
```

RabbitMQ → Realtime Gateway.

Socket event:

```text
article:stats
{
  articleId,
  likes,
  comments,
  views
}
```

Все пользователи, находящиеся в:

```text
article:{articleId}
```

видят обновление практически сразу.

---

# 14. Просмотры

Нельзя выполнять PostgreSQL `UPDATE views = views + 1` для каждого page view.

Используется Redis aggregation.

Просмотр засчитывается после:

- открытия статьи;
- нахождения страницы в visible state не менее нескольких секунд.

Dedupe key:

```text
view:{articleId}:{viewerId}
```

TTL, например:

```text
30 minutes
```

Для неавторизованного пользователя используется подписанный anonymous session ID.

Redis:

```text
INCR article:{id}:views
```

Worker периодически flush-ит delta в PostgreSQL.

Socket обновления агрегируются, например раз в 1–3 секунды.

Иначе популярная статья создаст неоправданно много socket events.

---

# 15. Comment Service

Функциональность:

- создание;
- редактирование;
- удаление;
- ответы;
- nested threads;
- likes комментариев;
- mentions;
- realtime;
- жалобы.

Таблица:

`comments`

- id;
- article_id;
- author_id;
- parent_id;
- root_id;
- depth;
- body;
- status;
- likes_count;
- created_at;
- updated_at;
- deleted_at.

UI поддерживает дерево комментариев.

Рекомендуемая визуальная вложенность:

до 3 уровней.

Более глубокие ответы хранятся корректно, но визуально могут быть flattened.

Endpoints:

```text
POST   /articles/:articleId/comments
GET    /articles/:articleId/comments
PATCH  /comments/:id
DELETE /comments/:id

PUT    /comments/:id/like
DELETE /comments/:id/like
```

Socket:

```text
comment:created
comment:updated
comment:deleted
comment:liked
```

На vc.ru также существует механизм `@mention`; пользователь получает уведомление при упоминании.

Такую же доменную механику необходимо поддержать.

---

# 16. Subscription Service

Подписываться можно на:

### User

```text
follow:user
```

### Category

```text
follow:category
```

Таблицы:

`user_follows`

```text
follower_id
following_id
created_at
```

`category_follows`

```text
user_id
category_id
created_at
```

Unique constraints обязательны.

После подписки публикуется:

```text
user.followed
user.unfollowed
category.followed
category.unfollowed
```

---

# 17. Feed Service

Поддерживаются:

## Fresh

Публикации:

```text
ORDER BY published_at DESC
```

Cursor pagination.

## Popular

Используется собственная scoring-модель.

Например:

```text
score =
    likes_weight
  + comments_weight
  + bookmarks_weight
  + views_weight
  + freshness_decay
```

Конкретные коэффициенты находятся в конфигурации Feed Service и могут изменяться без frontend release.

## My Feed

Включает статьи:

- пользователей, на которых подписан пользователь;
- категорий, на которые подписан пользователь.

MVP рекомендуется реализовать через **fan-out on read**.

Это значительно проще и достаточно до существенного роста аудитории.

Redis:

```text
feed:user:{userId}
feed:popular
feed:category:{categoryId}
```

TTL + event-driven invalidation.

Cursor pagination обязательна.

Offset pagination для больших лент запрещается.

---

# 18. Закладки

Endpoint:

```text
PUT    /articles/:id/bookmark
DELETE /articles/:id/bookmark
GET    /me/bookmarks
```

Таблица:

`bookmarks`

- user_id;
- article_id;
- created_at.

Unique:

```text
user_id + article_id
```

Закладки являются приватными.

MVP не требует папок.

Future:

- bookmark folders;
- tags;
- notes.

---

# 19. Messaging Service

MVP — direct messaging 1:1.

Функциональность:

- список диалогов;
- поиск пользователя;
- создание диалога;
- отправка сообщения;
- редактирование;
- soft delete;
- read receipt;
- unread counters;
- typing status;
- online/offline;
- блокировка пользователя;
- изображения/attachments.

Модель:

`conversations`

- id;
- type;
- created_at.

`conversation_members`

- conversation_id;
- user_id;
- last_read_message_id;
- joined_at.

`messages`

- id UUID;
- conversation_id;
- sender_id;
- body;
- reply_to_id;
- created_at;
- edited_at;
- deleted_at.

`message_attachments`

- message_id;
- media_id.

---

# 20. Messaging realtime

Room:

```text
conversation:{conversationId}
```

Events:

```text
message:send
message:created
message:updated
message:deleted

message:typing:start
message:typing:stop

message:read

user:online
user:offline
```

Для optimistic UI frontend генерирует:

```text
clientMessageId
```

Запрос:

```json
{
  "clientMessageId": "uuid",
  "conversationId": "uuid",
  "text": "Hello"
}
```

Server response:

```json
{
  "clientMessageId": "uuid",
  "messageId": "server-uuid",
  "status": "sent"
}
```

Это предотвращает дубли при retry.

---

# 21. Realtime Gateway

Отдельный stateless Node.js/NestJS service.

Использует Socket.IO.

Namespaces:

```text
/content
/comments
/engagement
/messages
/notifications
```

Rooms:

```text
user:{userId}
article:{articleId}
draft:{articleId}
category:{categoryId}
conversation:{conversationId}
```

Socket handshake содержит Firebase token.

Realtime Gateway:

1. проверяет токен;
2. получает internal user ID;
3. подключает пользователя к `user:{id}`.

Для горизонтального масштабирования:

```text
Socket.IO
   ↓
Redis Adapter
   ↓
multiple realtime-gateway replicas
```

Если используется Socket.IO polling fallback, load balancer должен поддерживать sticky sessions.

---

# 22. RabbitMQ

RabbitMQ используется для durable domain events.

Exchange:

```text
domain.events
```

Routing keys:

```text
article.created
article.published
article.updated
article.deleted

article.liked
article.unliked
article.viewed
article.bookmarked

comment.created
comment.updated
comment.deleted

user.followed
category.followed

message.created

media.uploaded
```

Каждый consumer имеет отдельную queue.

Пример:

```text
article.published
       │
       ├── feed-service
       ├── notification-service
       ├── realtime-gateway
       └── analytics-worker
```

Использовать:

- durable queues;
- publisher confirms;
- manual ACK;
- exponential retry;
- dead-letter queues;
- idempotent consumers.

---

# 23. Transactional Outbox

Критически важное требование.

Не выполнять:

```text
DB COMMIT
then RabbitMQ publish
```

наивно.

Иначе возможна ситуация:

1. статья сохранена;
2. процесс упал;
3. RabbitMQ событие не отправлено.

Каждый сервис использует таблицу:

`outbox_events`

- id UUID;
- event_type;
- aggregate_id;
- payload JSONB;
- created_at;
- processed_at.

Business transaction:

```text
BEGIN

UPDATE article ...

INSERT INTO outbox_events ...

COMMIT
```

Отдельный worker публикует outbox event в RabbitMQ.

---

# 24. Redis

Redis используется только для данных, которые можно восстановить.

Примеры ключей:

```text
user:{id}:profile
article:{id}:stats

article:{id}:views

feed:popular
feed:user:{id}

presence:user:{id}

rate:user:{id}
rate:ip:{ip}

socket:user:{id}
```

PostgreSQL остаётся source of truth.

Нельзя хранить единственный экземпляр важного пользовательского контента исключительно в Redis.

---

# 25. Notifications

Хотя отдельный центр уведомлений не указан в первоначальном scope, Notification Service нужен как техническая зависимость социальных функций.

События:

- кто-то ответил на комментарий;
- кто-то упомянул пользователя;
- новый подписчик;
- новый message;
- публикация автора, на которого подписан пользователь — configurable.

Таблица:

`notifications`

- id;
- user_id;
- type;
- actor_id;
- entity_type;
- entity_id;
- payload;
- read_at;
- created_at.

Текст уведомления в БД не хранится: сохраняются `type` и `payload`, а клиент локализует их на языке интерфейса. Email и push рендерятся на сервере на языке из `user_settings.locale`.

Socket:

```text
notification:new
notification:read
```

---

# 26. Profile

URL:

```text
/@username
```

Страница содержит:

- avatar;
- cover;
- display name;
- username;
- bio;
- registration date;
- число подписчиков;
- число подписок;
- кнопку Subscribe;
- кнопку Message;
- публикации пользователя.

Tabs:

```text
Posts
Comments
```

Для собственного профиля:

```text
Drafts
Bookmarks
Settings
```

Публичная модель vc.ru также разделяет профиль на публикации и комментарии и показывает подписчиков/подписки.

---

# 27. Frontend routes

## 27.1 Публичный сайт `<domain>`

Все публичные маршруты имеют префикс языка `/:locale`, где `locale ∈ { en, sr, ru }`. Сегмент `sr` соответствует локали `sr-Latn`.

```text
/                          → redirect на /{detectedLocale}

/:locale
/:locale/fresh
/:locale/popular
/:locale/feed

/:locale/category/:slug

/:locale/article/:slug

/:locale/@:username
/:locale/@:username/comments

/:locale/write
/:locale/write/:articleId
/:locale/preview/:articleId

/:locale/bookmarks

/:locale/messages
/:locale/messages/:conversationId

/:locale/settings/profile
/:locale/settings/account
/:locale/settings/appearance
```

`/admin` и `/:locale/admin` на публичном сайте возвращают `301` на `https://admin.<domain>`.

## 27.2 Админ-панель `admin.<domain>`

```text
/login
/                    dashboard
/users
/users/:id
/articles
/articles/:id
/comments
/reports
/categories
/categories/:id
/settings
/audit-log
```

Язык админ-панели хранится в `user_settings.locale` и cookie; в URL он не отражается, потому что админка не индексируется.

## 27.3 Canonical URL статьи

```text
/{articleLocale}/article-slug-{shortId}
```

или:

```text
/{articleLocale}/:categorySlug/:articleSlug
```

`articleLocale` — язык содержимого статьи (`articles.language`), а не текущий язык интерфейса. Статью можно открыть и с другим префиксом: интерфейс будет на выбранном языке, но canonical всегда указывает на версию с языком содержимого.

Slug должен быть editable независимо от primary key.

---

# 28. Frontend architecture

Структура:

```text
src/
  app/
  entities/
  features/
  widgets/
  shared/
```

Пример:

```text
entities/
  article/
  user/
  category/
  comment/
  message/

features/
  article-like/
  article-bookmark/
  user-follow/
  category-follow/
  comment-create/
  message-send/
```

Запрещается помещать всю бизнес-логику непосредственно в React components.

---

# 29. HeroUI

HeroUI используется для:

- Modal;
- Dropdown;
- Button;
- Input;
- Textarea;
- Avatar;
- Tooltip;
- Tabs;
- Popover;
- Skeleton;
- Card;
- Drawer;
- DropdownMenu;
- Pagination UI;
- Toast.

Для article renderer стили создаются отдельно.

Контент статьи не должен выглядеть как набор стандартных HeroUI Card.

Публичный сайт и админ-панель используют общий пакет `packages/ui`: HeroUI theme tokens, светлую и тёмную палитры, общие компоненты. Требования к темам описаны в разделе «Светлая и тёмная тема».

---

# 30. API design

REST используется для CRUD.

WebSocket — для realtime.

Не использовать WebSocket как единственный API.

Пример:

```text
POST /articles
PATCH /articles/:id
POST /articles/:id/publish

GET /articles/:slug

PUT /articles/:id/like

POST /articles/:id/comments

PUT /users/:id/follow

GET /feed

GET /messages
```

Socket является слоем синхронизации UI, а PostgreSQL/REST остаётся источником истины.

---

# 31. API versioning

Все endpoints:

```text
/api/v1/*
```

Например:

```text
GET /api/v1/articles/:slug
```

Версия WebSocket protocol передаётся:

```text
protocolVersion: 1
```

---

# 32. Pagination

Для:

- articles;
- comments;
- messages;
- followers;
- bookmarks;

используется cursor pagination.

Пример:

```text
GET /api/v1/feed?cursor=xxxx&limit=20
```

Response:

```json
{
  "items": [],
  "nextCursor": "xxxx",
  "hasMore": true
}
```

---

# 33. Firebase Authentication

Frontend выполняет Firebase Authentication.

После авторизации:

```text
Firebase
   ↓
ID Token
   ↓
API Gateway
   ↓
Firebase Admin SDK verifyIdToken()
```

На первом authenticated request:

если `firebase_uid` неизвестен:

```text
User Service → create user
```

Firebase отвечает исключительно за identity.

Профиль, username, followers, messages, articles и permissions находятся в собственной БД.

Не использовать Firestore в качестве базы проекта.

---

# 34. Authorization

Проверки:

```text
article.author_id === request.user.id
```

или:

```text
role IN ('MODERATOR', 'ADMIN')
```

Права никогда не должны определяться только frontend.

---

# 35. Безопасность Editor.js

Особое внимание:

- XSS;
- malicious HTML;
- SVG;
- iframe;
- URL protocols;
- JavaScript URLs.

Разрешённые протоколы:

```text
https:
http:
mailto:
```

Для embeds используется allowlist доменов.

`Raw HTML`:

по умолчанию отключён для обычных пользователей.

---

# 36. Rate limiting

Redis-based.

Начальные значения:

```text
comments       20/min/user
likes          60/min/user
follows        30/min/user
messages       60/min/user
article update 60/min/user
media upload   20/hour/user
```

Отдельные лимиты по IP для anonymous endpoints.

Все значения конфигурируемые.

---

# 37. Anti-spam

Минимально:

- account age;
- rate limits;
- duplicate content detection;
- suspicious link limit;
- repeated comment detection;
- user blocks;
- report system.

Таблица:

`reports`

- reporter_id;
- entity_type;
- entity_id;
- reason;
- status;
- moderator_id;
- created_at.

---

# 38. Delete model

Использовать soft deletion для:

- users;
- articles;
- comments;
- messages.

Пример:

```text
deleted_at
```

Физическое удаление выполняется отдельным retention worker при необходимости.

---

# 39. SEO

Для каждой статьи:

```text
<title>
<meta description>
canonical
OpenGraph
Twitter Cards
JSON-LD
```

Generate:

```text
Article JSON-LD
BreadcrumbList
Person
```

Мультиязычность:

- у локализованных страниц (главная, ленты, категории, профили) есть `<link rel="alternate" hreflang="en|sr-Latn|ru|x-default">`;
- `<html lang>` соответствует языку интерфейса;
- у контейнера содержимого статьи атрибут `lang` равен `articles.language`;
- `inLanguage` в Article JSON-LD равен `articles.language`;
- sitemap содержит `xhtml:link` alternate для локализованных страниц.

Админ-панель полностью закрыта от индексации: `robots.txt` с `Disallow: /` и заголовок `X-Robots-Tag: noindex, nofollow`.

Sitemap:

```text
/sitemap.xml
/sitemap-articles-1.xml
/sitemap-categories.xml
/sitemap-users.xml
```

robots.txt обязателен.

Draft/preview:

```text
noindex
nofollow
```

---

# 40. SSR / caching

Статья отдаётся SSR.

Cache:

```text
article:{slug}
```

Invalidation после:

```text
article.updated
article.deleted
```

CDN может кешировать публичные article pages.

Персональные данные не должны попадать в shared CDN cache.

---

# 41. Search

Не входит в обязательный MVP.

Однако API и структура данных проектируются так, чтобы позднее подключить:

- PostgreSQL FTS;
- Meilisearch;
- OpenSearch.

Для MVP достаточно поиска:

```text
ILIKE / tsvector
```

по:

- title;
- author;
- category.

`tsvector` строится с конфигурацией по `articles.language`: `english` для `en`, `russian` для `ru`, для `sr-Latn` — `serbian`, если она есть в используемой сборке PostgreSQL, иначе `simple` + `unaccent`. Поиск по категориям идёт по `category_translations` всех языков.

---

# 42. PostgreSQL ownership

В идеальной микросервисной архитектуре каждый сервис владеет собственной БД.

На старте допускается:

```text
1 PostgreSQL cluster
```

и отдельные schemas:

```text
users
content
comments
engagement
social
messages
notifications
```

Сервису запрещено напрямую обращаться к таблицам другого сервиса.

Коммуникация:

```text
REST
RabbitMQ
```

Это позволит позже физически разделить базы без полного переписывания приложения.

---

# 43. Indexes

Обязательные индексы:

```text
articles(author_id, published_at DESC)

articles(category_id, published_at DESC)

articles(status, published_at DESC)

comments(article_id, created_at)

comments(parent_id)

article_likes(article_id)

bookmarks(user_id, created_at DESC)

user_follows(follower_id)
user_follows(following_id)

messages(conversation_id, created_at DESC)

notifications(user_id, read_at, created_at DESC)
```

Использовать `EXPLAIN ANALYZE` перед production release ключевых запросов.

---

# 44. Observability

Каждый request содержит:

```text
x-request-id
```

Логи — structured JSON.

Каждый RabbitMQ event:

```text
eventId
correlationId
causationId
timestamp
producer
eventVersion
```

Рекомендуемый additional stack:

- OpenTelemetry;
- Prometheus;
- Grafana;
- Loki;
- Sentry.

---

# 45. Health checks

Каждый сервис:

```text
GET /health/live
GET /health/ready
```

Readiness проверяет:

- PostgreSQL;
- Redis;
- RabbitMQ.

---

# 46. Docker

Каждый сервис имеет отдельный `Dockerfile`.

Local environment:

```text
docker-compose.yml
```

Минимальные контейнеры:

```text
web
admin
api-gateway

user-service
content-service
category-service
comment-service
engagement-service
subscription-service
feed-service
messaging-service
notification-service
media-service
realtime-gateway

postgres
redis
rabbitmq
minio
```

---

# 47. Monorepo

Рекомендуется monorepo:

```text
apps/
  web
  admin
  api-gateway
  users
  content
  categories
  comments
  engagement
  social
  feed
  messaging
  notification
  media
  realtime

packages/
  contracts
  database
  logger
  config
  firebase
  rabbitmq
  redis
  eslint-config
  tsconfig
  ui
  i18n
```

`packages/ui` содержит HeroUI theme tokens и общие компоненты для `web` и `admin`.

`packages/i18n` содержит список локалей, каталоги переводов (ICU JSON), форматтеры дат и чисел, транслитерацию для slug.

Tooling:

```text
pnpm
Turborepo
```

Особенно важно иметь:

```text
packages/contracts
```

для API DTO и event contracts.

---

# 48. Testing

## Unit

Минимум:

- domain services;
- permission rules;
- score functions;
- sanitizers.

## Integration

Через testcontainers:

- PostgreSQL;
- Redis;
- RabbitMQ.

## API

Проверить:

- Firebase authentication;
- CRUD articles;
- comments;
- likes;
- follows;
- messages.

## E2E

Playwright.

Критические сценарии:

```text
register
→ create profile
→ create article
→ publish
→ another user opens
→ like
→ comment
→ author sees realtime update
```

и:

```text
user A → message user B
→ B receives socket event
→ opens chat
→ read receipt
```

и:

```text
moderator → login admin.<domain> (MFA)
→ opens report
→ hides comment
→ comment disappears on web without refresh
→ action recorded in audit log
```

## i18n и темы

- CI-проверка: все ключи из `en` есть в `sr-Latn` и `ru`, лишних ключей нет;
- unit-тесты plural-форм для `ru` и `sr-Latn` (1, 2, 5, 11, 21, 22, 25);
- Playwright visual regression ключевых страниц в матрице `{ light, dark } × { en, sr-Latn, ru }`;
- E2E: смена языка и темы сохраняется после перезагрузки и повторного входа;
- автоматическая проверка контраста (axe-core) в обеих темах.

---

# 49. Performance requirements

При номинальной нагрузке:

API:

```text
p95 < 300 ms
```

Cached GET:

```text
p95 < 100 ms
```

Socket propagation:

```text
p95 < 500 ms
```

Editor live preview:

```text
p95 < 300 ms
```

Initial article page:

```text
LCP < 2.5 sec
```

Feed:

```text
20 items/request
```

---

# 50. Availability

Production target:

```text
99.9%
```

Все backend services stateless, кроме инфраструктурных систем.

Допускается горизонтальное масштабирование:

```text
api-gateway × N
content × N
realtime × N
feed × N
```

---

# 51. Consistency model

Strong consistency нужна для:

- создания статьи;
- публикации;
- сообщения;
- комментария;
- permissions.

Eventual consistency допустима для:

- views;
- likes counters;
- comments counters;
- feed cache;
- followers counters;
- notifications.

Например:

лайк уже записан в `article_likes`, но UI counter может обновиться через 100–500 ms.

Это нормальная архитектурная модель.

---

# 52. Backup

PostgreSQL:

- daily full backup;
- WAL/PITR;
- retention минимум 14–30 дней.

S3:

- versioning;
- lifecycle policy.

Redis:

не является единственной точкой хранения business data.

RabbitMQ:

durable queues/quorum queues для критичных событий.

---

# 53. MVP

В первый production release входят:

- Firebase registration/login;
- user profile;
- categories;
- subscriptions на пользователей;
- subscriptions на категории;
- Editor.js;
- draft;
- autosave;
- preview;
- publication;
- article editing;
- media upload;
- Fresh feed;
- Popular feed;
- My Feed;
- likes;
- comments;
- nested comments;
- views;
- bookmarks;
- direct messages;
- unread message counters;
- realtime article counters;
- realtime comments;
- realtime messages;
- basic notification events;
- moderation;
- admin category management;
- отдельная админ-панель на `admin.<domain>` с MFA и журналом аудита;
- светлая, тёмная и системная тема на публичном сайте и в админ-панели;
- интерфейс на `en`, `sr-Latn`, `ru`, включая письма, уведомления и переводы категорий.

---

# 54. Phase 2

После MVP:

- search service;
- article recommendations;
- hashtags;
- polls;
- bookmark folders;
- scheduled publication;
- collaborative editing;
- company accounts;
- multiple authors;
- article analytics;
- reading history;
- push notifications;
- email notifications;
- user mute/block;
- trending categories;
- advanced moderation;
- AI summaries;
- article import.

---

# 55. Реализация feed ranking

Не рекомендую начинать проект с ML-рекомендаций.

MVP Popular score:

```text
score =
  log10(max(views, 1))       * Wv
+ log10(max(likes, 1))       * Wl
+ log10(max(comments, 1))    * Wc
+ log10(max(bookmarks, 1))   * Wb
- ageHours                   * decay
```

My Feed:

```text
followedAuthors
UNION
followedCategories
```

с сортировкой:

```text
published_at DESC
```

После накопления данных можно добавить:

- CTR;
- dwell time;
- read completion;
- hide signals;
- author affinity;
- category affinity.

---

# 56. Ключевой поток публикации

```text
Editor
  ↓
autosave
  ↓
Content Service
  ↓
PostgreSQL draft
  ↓
Publish
  ↓
sanitize/validate
  ↓
HTML render
  ↓
PostgreSQL
  ↓
Outbox
  ↓
RabbitMQ
  ├── Feed Service
  ├── Realtime Gateway
  └── Notification Service
```

---

# 57. Ключевой поток лайка

```text
React
   ↓
PUT /articles/:id/like
   ↓
Engagement Service
   ↓
PostgreSQL
   ↓
Outbox
   ↓
RabbitMQ
   ↓
Realtime Gateway
   ↓
Socket.IO
   ↓
all article viewers
```

Frontend делает optimistic update сразу.

Если server response содержит ошибку — rollback.

---

# 58. Ключевой поток комментария

```text
User
 ↓
POST comment
 ↓
Comment Service
 ↓
PostgreSQL
 ↓
Outbox
 ↓
RabbitMQ
 ├── engagement counter
 ├── realtime gateway
 └── notification
```

Автор публикации и открытые клиенты получают комментарий без refresh.

---

# 59. Ключевой поток сообщения

```text
User A
 ↓
Socket / REST
 ↓
Messaging Service
 ↓
PostgreSQL
 ↓
Outbox
 ↓
RabbitMQ
 ↓
Realtime Gateway
 ↓
User B
```

Если B offline:

сообщение остаётся в PostgreSQL.

При следующем подключении пользователь получает unread count.

---

# 60. Definition of Done MVP

MVP считается завершённым, когда выполняется полный сценарий:

1. Пользователь регистрируется через Firebase.
2. Создаёт username и профиль.
3. Подписывается на категорию.
4. Открывает редактор.
5. Создаёт статью из Editor.js blocks.
6. Загружает изображения.
7. Draft автоматически сохраняется.
8. Второе preview-окно получает изменения через Socket.IO.
9. Пользователь публикует статью.
10. Статья появляется в категории и Fresh feed.
11. Подписчик видит её в My Feed.
12. Второй пользователь открывает статью.
13. Просмотр учитывается.
14. Он ставит лайк.
15. Первый пользователь без refresh видит изменение likes counter.
16. Второй пользователь пишет комментарий.
17. Комментарий появляется у первого через Socket.IO.
18. Article comment counter обновляется.
19. Пользователь сохраняет статью в bookmarks.
20. Пользователь подписывается на автора.
21. Один пользователь отправляет другому direct message.
22. Получатель видит сообщение без refresh.
23. Read receipt обновляется у отправителя.
24. После перезапуска сервисов ни статья, ни комментарии, ни сообщения не теряются.
25. Пользователь переключает язык на `sr-Latn`, затем на `ru`: интерфейс, даты, plural-формы и названия категорий отображаются корректно, выбор сохраняется после повторного входа.
26. Пользователь переключает тёмную тему: при перезагрузке SSR-страницы нет вспышки светлой темы, статья, код и embeds читаемы.
27. Модератор входит на `admin.<domain>` с MFA, скрывает комментарий по жалобе; комментарий исчезает у читателей без refresh, действие видно в журнале аудита.
28. Пользователь без роли `MODERATOR`/`ADMIN` не может ни войти в админ-панель, ни вызвать `/api/v1/admin/*`.

---

# 61. Админ-панель

## 61.1 Размещение

Админ-панель — отдельное приложение `apps/admin`, доступное только на поддомене:

```text
https://admin.<domain>
```

- Отдельный Docker-образ и отдельный deploy, независимый от `web`.
- Статический SPA-бандл раздаётся через Nginx/Traefik или CDN.
- В бандле публичного сайта нет кода админки.
- Опционально: IP allowlist или VPN на уровне ingress для `admin.<domain>`.

## 61.2 Аутентификация и доступ

- Вход через тот же Firebase project, но сессия изолирована: Firebase Auth хранит состояние per-origin, поэтому вход на `<domain>` не даёт автоматического доступа к `admin.<domain>`.
- Для ролей `MODERATOR` и `ADMIN` обязательна Firebase multi-factor authentication (TOTP или SMS).
- После входа админка вызывает `GET /api/v1/admin/me`. Если роль не `MODERATOR`/`ADMIN`, показывается экран «Нет доступа», и выполняется sign out.
- Роль всегда проверяется на backend при каждом запросе; скрытие пунктов меню на frontend — только UX.
- Idle timeout сессии — 30 минут (настраивается), после него нужен повторный вход.
- Security headers: строгий `Content-Security-Policy`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, `X-Robots-Tag: noindex, nofollow`.

## 61.3 Разделы и права

```text
Раздел        MODERATOR                      ADMIN
Dashboard     просмотр                       просмотр
Users         просмотр, блокировка           + назначение ролей, удаление
Articles      скрытие, смена категории       + восстановление, удаление
Comments      скрытие                        + восстановление, удаление
Reports       работа с жалобами              работа с жалобами
Categories    —                              CRUD, переводы, порядок
Settings      —                              feed weights, rate limits, embed allowlist
Audit log     только свои действия           все действия
```

Dashboard: DAU/MAU, новые пользователи, публикации, комментарии, открытые жалобы, состояние сервисов (агрегация `/health/ready`).

Списки строятся на TanStack Table с серверными фильтрами, сортировкой и cursor pagination.

## 61.4 Admin API

```text
GET    /api/v1/admin/me

GET    /api/v1/admin/users
GET    /api/v1/admin/users/:id
POST   /api/v1/admin/users/:id/block
POST   /api/v1/admin/users/:id/unblock
PUT    /api/v1/admin/users/:id/role

GET    /api/v1/admin/articles
POST   /api/v1/admin/articles/:id/hide
POST   /api/v1/admin/articles/:id/restore
PATCH  /api/v1/admin/articles/:id/category

GET    /api/v1/admin/comments
POST   /api/v1/admin/comments/:id/hide
POST   /api/v1/admin/comments/:id/restore

GET    /api/v1/admin/reports
PATCH  /api/v1/admin/reports/:id

GET    /api/v1/admin/categories
POST   /api/v1/admin/categories
PATCH  /api/v1/admin/categories/:id
PUT    /api/v1/admin/categories/:id/translations/:locale

GET    /api/v1/admin/settings
PATCH  /api/v1/admin/settings

GET    /api/v1/admin/audit-log
GET    /api/v1/admin/stats
```

API Gateway маршрутизирует admin-запросы в соответствующие доменные сервисы. Отдельный «admin-service» с доступом к чужим таблицам не создаётся: правило владения данными (раздел 42) действует и для админки.

## 61.5 Журнал аудита

`admin_audit_log` (schema `users` или отдельная schema `audit`):

- id UUID;
- actor_id UUID;
- action VARCHAR — например `comment.hide`, `user.role.change`;
- entity_type;
- entity_id;
- before JSONB;
- after JSONB;
- reason TEXT;
- ip;
- user_agent;
- request_id;
- created_at.

Журнал append-only: UPDATE и DELETE запрещены на уровне прав БД. Для действий `hide`, `block` и `role change` поле `reason` обязательно.

Модерационные действия публикуют события:

```text
moderation.article.hidden
moderation.comment.hidden
moderation.user.blocked
user.role.changed
```

Realtime Gateway по ним убирает скрытый контент у открытых клиентов.

---

# 62. Светлая и тёмная тема

## 62.1 Режимы

```text
light
dark
system   (по умолчанию, следует prefers-color-scheme)
```

Требования одинаковы для публичного сайта и админ-панели.

## 62.2 Реализация

- Темы задаются через HeroUI v3 theming (Tailwind CSS v4, CSS variables) в `packages/ui`.
- Тема применяется классом/атрибутом на `<html>` (`class="dark"` / `data-theme`) по документации HeroUI v3.
- Hardcoded цвета в компонентах запрещены: только semantic tokens (`background`, `foreground`, `surface`, `accent`, `danger` и т.д.).
- Переключатель темы в header и в `/settings/appearance`.

## 62.3 Хранение выбора

1. Cookie `theme` (`light|dark|system`), 1 год, `SameSite=Lax`, общий домен `.<domain>`, чтобы выбор распространялся и на админку.
2. Для авторизованного пользователя — `user_settings.theme`, синхронизируется между устройствами.
3. Приоритет: явный выбор в текущей сессии > `user_settings.theme` > cookie > `system`.

## 62.4 Отсутствие вспышки темы (FOUC)

- SSR читает cookie `theme` и сразу рендерит `<html>` с нужным классом.
- Для `system` в `<head>` добавляется маленький blocking inline script, который до hydration применяет `prefers-color-scheme`.
- `<meta name="color-scheme" content="light dark">` и `theme-color` для обеих тем.
- Подписка на `matchMedia('(prefers-color-scheme: dark)')`: в режиме `system` тема меняется без перезагрузки.

## 62.5 Контент статей

- Article renderer (типографика, цитаты, таблицы, callout, spoiler) использует CSS variables и выглядит корректно в обеих темах.
- Подсветка кода: отдельные light и dark темы (например, Shiki dual themes).
- Embeds с поддержкой темы (X/Twitter, Telegram) получают параметр темы при рендере; при смене темы они перерисовываются.
- Изображения не инвертируются; прозрачным PNG/SVG подкладывается нейтральный фон.
- Editor.js в режиме редактирования тоже поддерживает обе темы: toolbar, popover, inline tools.

## 62.6 Доступность

- Контраст текста не ниже WCAG 2.2 AA (4.5:1 для обычного текста, 3:1 для крупного и UI-элементов) в обеих темах.
- Состояния focus, hover, disabled и error различимы в обеих темах.

---

# 63. Локализация (i18n)

## 63.1 Языки

```text
Локаль    URL-сегмент   Название в переключателе
en        en            English
sr-Latn   sr            Srpski (latinica)
ru        ru            Русский
```

- Язык по умолчанию и fallback — `en`.
- Сербский поддерживается только латиницей; кириллический сербский не входит в scope.
- Все три языка обязательны к релизу: нельзя выпустить ключ перевода без значения во всех трёх каталогах.

## 63.2 Разделение языка интерфейса и языка контента

- **Язык интерфейса** — выбор пользователя: меню, кнопки, системные тексты, письма, уведомления.
- **Язык контента** — `articles.language`, задаётся автором при публикации (по умолчанию — текущий язык интерфейса автора) и может быть изменён.
- Пользовательский контент (статьи, комментарии, сообщения) не переводится автоматически.
- Ленты по умолчанию показывают публикации на всех языках; пользователь может ограничить их через `user_settings.content_languages`. Feed Service фильтрует по `articles.language`.

## 63.3 Определение языка

Публичный сайт, по приоритету:

1. сегмент `/:locale` в URL;
2. cookie `NEXT_LOCALE` (домен `.<domain>`);
3. `user_settings.locale` авторизованного пользователя;
4. заголовок `Accept-Language` (`sr`, `sr-Latn`, `sr-RS`, `hr`, `bs` → `sr-Latn`);
5. `en`.

Смена языка через переключатель обновляет URL, cookie и `user_settings.locale`.

## 63.4 Переводы

- Хранятся в `packages/i18n/messages/{en,sr-Latn,ru}.json` в формате ICU MessageFormat с namespaces (`common`, `feed`, `article`, `editor`, `comments`, `messages`, `profile`, `settings`, `errors`, `notifications`, `admin`).
- Plural-формы через ICU `plural`: у `ru` формы `one/few/many/other`, у `sr-Latn` — `one/few/other`.
- Ключи типизированы: TypeScript проверяет существование ключа на этапе сборки.
- CI падает, если в каталогах разный набор ключей или в сообщениях разные ICU-плейсхолдеры.
- Конкатенация переведённых строк в коде запрещена: только сообщения с плейсхолдерами.

## 63.5 Форматирование

- Даты, время, числа и счётчики форматируются через `Intl` с текущей локалью (`Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`); для компактных счётчиков — `notation: 'compact'`.
- Время хранится в UTC, отображается в часовом поясе пользователя.
- Шрифты подключаются с подмножествами `latin`, `latin-ext` (č, ć, š, ž, đ) и `cyrillic`.

## 63.6 Backend

- Backend не возвращает пользовательских текстов в ошибках, только машиночитаемые коды:

```json
{
  "error": {
    "code": "ARTICLE_VERSION_CONFLICT",
    "params": { "serverVersion": 12 }
  }
}
```

  Frontend переводит `code` по namespace `errors`.
- Ошибки валидации возвращают `field` + `code`, а не готовый текст.
- Email-шаблоны (Notification Service) есть в трёх языках и выбираются по `user_settings.locale`.
- Для писем Firebase (подтверждение email, сброс пароля) frontend выставляет `auth.languageCode` в текущую локаль; если Firebase не поддерживает язык, используется собственный email action handler с локализованными шаблонами.
- Slug генерируется транслитерацией: кириллица `ru` → латиница, сербская латиница `č ć š ž đ` → `c c s z dj`. Реализация в `packages/i18n`, используется Content Service и Category Service.

## 63.7 Editor.js

- UI Editor.js (toolbox, tunes, inline tools, сообщения об ошибках) локализуется через параметр `i18n` Editor.js на три языка.
- Custom tools (spoiler, poll, CTA, audio, Telegram embed) берут подписи из общих каталогов.

## 63.8 Админ-панель

- Админ-панель полностью локализована на три языка через те же каталоги (namespace `admin`).
- В форме категории редактируются `name` и `description` для каждой локали; незаполненные переводы подсвечиваются.

---

# 64. Важные архитектурные правила

1. PostgreSQL — source of truth.

2. Redis не используется как постоянная база пользовательского контента.

3. RabbitMQ используется для asynchronous domain events.

4. Socket.IO используется для realtime delivery.

5. Socket.IO не заменяет RabbitMQ.

6. RabbitMQ не заменяет Socket.IO.

7. Firebase отвечает за authentication, но не за business users.

8. Все сервисы используют внутренний `user UUID`, а не Firebase UID.

9. Каждый сервис владеет собственной моделью данных.

10. Нельзя выполнять JOIN непосредственно между таблицами разных микросервисов.

11. Все business events доставляются минимум `at-least-once`.

12. Consumers обязаны быть idempotent.

13. Все write operations, которые инициируют event, используют Transactional Outbox.

14. Все публичные статьи SSR-rendered.

15. Editor.js JSON валидируется и sanitizes повторно на backend.

16. Админ-панель живёт только на `admin.<domain>`, права проверяются на backend, каждое административное действие попадает в журнал аудита.

17. Backend возвращает коды ошибок, а не тексты; весь пользовательский текст интерфейса локализуется на `en`, `sr-Latn`, `ru`.

18. Язык интерфейса и язык контента — разные сущности.

19. UI использует только semantic theme tokens; каждый экран проверяется в светлой и тёмной теме.

---

# 65. Рекомендуемая граница микросервисов

Итоговая схема:

```text
api-gateway

identity/users
content
categories
media

comments
engagement
social/subscriptions

feed

messaging
notifications

realtime
```

Это достаточно мелкое разбиение для независимого масштабирования, но ещё не превращает проект в чрезмерно раздробленный «зоопарк» из двадцати сервисов.

Особенно не рекомендуется создавать отдельные микросервисы `LikeService`, `ViewService`, `BookmarkService`: все три принадлежат одному bounded context `Engagement`.

Так же `followers` и `category subscriptions` целесообразно держать внутри одного `Social/Subscription Service`.

---

# 66. Итоговая архитектура

Для заданного продукта оптимальная схема:

```text
<domain>: React / Next.js / HeroUI      admin.<domain>: React / Vite / HeroUI
        │                                       │
        └───────────────────┬───────────────────┘
                            ▼
API Gateway  (/api/v1/*, /api/v1/admin/*)
        │
        ├── User Service
        ├── Content Service
        ├── Category Service
        ├── Media Service
        ├── Comment Service
        ├── Engagement Service
        ├── Subscription Service
        ├── Feed Service
        ├── Messaging Service
        └── Notification Service

PostgreSQL ← source of truth

Redis ← cache / counters / presence / socket adapter

RabbitMQ ← domain event bus

Socket.IO ← realtime delivery

Firebase ← authentication

S3 / MinIO ← media
```

Такая архитектура покрывает указанный функционал и позволяет независимо масштабировать самые нагруженные части системы: feed, engagement, messaging, media и websocket layer.

---

# 67. Декомпозиция

Декомпозиция на эпики, задачи и milestones: [`DECOMPOSITION.md`](./DECOMPOSITION.md).
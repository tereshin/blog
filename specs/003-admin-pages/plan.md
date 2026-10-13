# Implementation Plan: Простые страницы в админке

**Branch**: `main` | **Feature**: `003-admin-pages` | **Date**: 2026-10-12
| **Spec**: [spec.md](./spec.md)

**Input**: `specs/003-admin-pages/spec.md`.

План подготовлен в текущей ветке. `setup-plan.sh` возвращает `003-admin-pages`
как идентификатор фичи; Git-ветка не создавалась.

## Summary

Добавить в главный каталог админки раздел «Страницы» для `superadmin`:
список, создание, редактор Editor.js, ручное сохранение, предпросмотр,
публикация, снятие с публикации и удаление. Публичная ссылка — `/pages/{slug}`.
Страница — отдельная сущность `content-service`, без темы и социальных механик.
Editor.js, инструменты, загрузка медиа и оболочка уже существуют.

Сохраняется одна текущая версия: правка опубликованной страницы сразу
становится публичной после успешного сохранения. Интерфейс сообщает об этом
перед действием. Адрес фиксируется после первой публикации. Старый `/about` удалён
вместе с настройками и SEO; содержимое новой страницы создаётся через pages. Меню и подвал, автосохранение, история версий и отдельный
черновик правок не входят в MVP.

## Technical Context

**Language/Version**: TypeScript strict, Node.js 22 LTS, ESM; React 19.

**Primary Dependencies**: Существующие Fastify, Drizzle, Zod, React Router,
TanStack Query, HeroUI v3, Tailwind 4, Editor.js и инструменты, DOMPurify,
sanitize-html. Новых runtime-зависимостей не требуется.

**Storage**: PostgreSQL 16, база `content`: `pages` и `page_mutations`.
Документ — JSONB `BlocksDocument`. События — существующий outbox/NATS.
Файлы — существующий media-service. Локальная форма — память вкладки.

**Testing**: Vitest unit/contract; integration на PostgreSQL через
`@blog/db-kit/testing`; outbox и доставка по существующим средствам брокера;
Storybook для renderer/списка/форм; Playwright против `local`.

**Target Platform**: Существующий браузерный клиент и Compose local/dev/prod.
Общая оболочка: 390 / 1024 / 1280px и промежуточные ширины.

**Project Type**: pnpm-монорепо веб-приложения с gateway и сервисами.

**Performance Goals**: Editor.js вне initial chunk; прежний бюджет initial JS
≤ 200 KB gzip. Список по 20 записей, максимум 100 в порции; виртуализация при
накоплении > 100. Публичное чтение по индексу slug; список без JSONB документов.

**Constraints**: Cookie/CSRF и подписанный ServiceContext; права проверяются
сервером. Запись ≤ 1 MiB, ≤ 500 блоков, глубина списков ≤ 10.
`X-Idempotency-Key` обязателен; запись/outbox/результат повтора атомарны.
Цепочка с проверкой файла ≤ `gateway → content → media`.

**Scale/Scope**: Небольшой набор информационных страниц, профиль проверки до
500 активных страниц. Меняются contracts, content, gateway и web; media API
используется существующий. Новых сервисов/контейнеров/хранилищ нет.

## Constitution Check — до Phase 0

Конституция 2.0.0 и `.cursor/rules/` прочитаны до составления плана.

| Принцип | Решение | Статус |
| --- | --- | --- |
| I. Владение данными | Страница и дедупликация в content; файл через media API; событие в outbox одной транзакции | PASS |
| II. FSD | Страницы компонуют widgets/features; renderer в shared; page не импортирует article; запросы через shared/api | PASS |
| III. Сессия и секреты | Cookie/CSRF; форма в памяти, 401 сохраняет текст; HTML через санитайзер | PASS |
| IV. Контракты и проверки | Zod/OpenAPI, события v1, интеграционные проверки доступа/версий/повторов, stories/E2E | PASS |
| V. Каркас и инфраструктура | Все маршруты в ShellLayout; Compose и состав infra не расширяются | PASS |

## Project Structure

### Documentation

```text
specs/003-admin-pages/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/
    ├── pages.md
    └── admin-ui.md
```

`tasks.md` создаётся следующим этапом `speckit-tasks`; этот план заканчивается
дизайном и сценариями проверки, без реализации.

### Source Code — запланированные изменения

```text
packages/contracts/src/
├── http/pages.ts
├── events/content/page-updated.v1.ts
└── events/content/page-deleted.v1.ts
services/content-service/src/
├── modules/page/
│   ├── page.routes.ts / page.controller.ts
│   ├── page.service.ts / page.repository.ts
│   ├── page.schema.ts / page.types.ts / page.errors.ts
│   ├── page.events.ts / page.cursor.ts / page.idempotency.ts
│   └── index.ts
├── shared/editor-document/       # общий санитайзер, содержательность, ошибки
├── modules/article/              # потребитель общего санитайзера
├── modules/seo/                  # опубликованные страницы, sitemap
└── infra/db/schema.ts + migrations/20261012_add_pages.sql
services/gateway-service/src/modules/proxy/route-table.ts
apps/web/src/
├── entities/page/                # API, модели, query keys, PageContent
├── entities/admin/model/admin-navigation.ts
├── features/manage-pages/        # форма, мутации, действия
├── widgets/editor/              # чтение снимка и подтверждение записи
├── shared/ui/BlockRenderer.tsx
├── shared/lib/sanitize-inline.ts
├── entities/article/            # миграция потребителей renderer
├── pages/admin-pages/
├── pages/admin-page-new/
├── pages/admin-page-edit/
├── pages/simple-page/
├── widgets/admin/ + widgets/shell/
└── app/routes/router.tsx
```

**Structure Decision**: Page следует структуре текущих модулей content. Общий документ
не знает о статье/странице. Политику файлов передаёт владелец use case;
DI — в сборке приложения. Контракты не содержат бизнес-логики.
Имена и экспорты следуют `.cursor/rules`.

## Phase 0 — результат исследования

Решения и альтернативы в [research.md](./research.md). Проверены текущие
точки повторного использования и официальная документация Editor.js.

Обязательные изменения для повторного использования:

1. Выделить общий renderer и очищать caption цитаты, который сейчас напрямую
   вставляется в DOM. Мигрировать прежних потребителей и stories одновременно.
2. Разделить чтение Editor.js для preview и подтверждение сохранённого снимка.
   Успех записи не сбрасывает более новые правки.
3. Общий серверный санитайзер сохраняет медиаполитику статьи и разрешает
   существующие файлы страницы другому суперадминистратору.
4. Дедупликация page-мутаций в PostgreSQL: сам заголовок HTTP-клиента
   повторное создание не предотвращает.

## Phase 1 — дизайн

### Данные и API

Модель и транзакции — [data-model.md](./data-model.md), форматы и ошибки —
[contracts/pages.md](./contracts/pages.md).

Публичный GET `/v1/pages/{slug}` отдаёт только published. Административные
GET/POST `/v1/admin/pages`, GET/PATCH/DELETE `/v1/admin/pages/{id}` требуют
superadmin. POST всегда создаёт draft. PATCH атомарно сохраняет поля и статус;
публикация содержит текущий документ, снятие — status=draft. PATCH/DELETE
передают expected_version; каждая мутация имеет стабильный ключ повтора.

Порядок: права → ключ повтора → согласованная текущая версия → проверка
содержания/media → запись страницы/outbox/ответа → commit. Конкурирующие
изменения сериализуются блокировкой строки и проверкой версии. Санитайзер
не импортирует ORM. Уникальный индекс разрешает гонку создания адреса.

### Админка и Editor.js

Интерфейс — [contracts/admin-ui.md](./contracts/admin-ui.md). Добавить pages
в ADMIN_ROUTES с parent=home, role=superadmin, иконкой документа и переводами
ru/en/sr. Обновить union типов, ADMIN_ICONS, маршруты и динамический родитель
в шапке. Static new регистрируется перед :id.

`pages/admin-page-*` компонуют `widgets/editor` и `features/manage-pages`.
Feature получает callback чтения снимка; импорта widget из feature нет.
При первоначальной загрузке форма получает документ один раз. Refetch
не перезаписывает локальные поля. При переходе между существующими ID
экземпляр меняется только после проверки несохранённых правок. После POST
форма остаётся на new и получает page_id в модели, сохраняя тот же экземпляр.
Повторное открытие из списка использует :id. Save/publish выключены до
готовности редактора и на время записи/загрузки файла.

Предпросмотр не записывает и не подтверждает dirty-снимок. Ошибка загрузки
редактора имеет повтор и выход. Успех подтверждает отправленный снимок;
новые правки остаются dirty. Draft-model и редактор остаются смонтированными
при 401, вход открывается поверх раздела; мутации блокируются до проверки роли.
Unsaved dialog — существующий shared/ui/Dialog + blocker маршрутизатора;
beforeunload дополняет его для перезагрузки/закрытия вкладки.

Список/статус обновляются оптимистично с rollback. Надпись «Сохранено»
и подтверждение dirty только после ответа. После успеха инвалидируются
точные page/list и SEO keys; гостевой кэш не получает непроверенную
публикацию. Retry сохраняет тот же payload/key; новые правки — новая операция.

### Публичная страница и SEO

`pages/simple-page` показывает заголовок и PageContent с общим renderer.
Шапка — back/title, темы не подсвечиваются. 404 в центре оболочки;
5xx — отдельная ошибка с повтором. Public query refetch при mount/focus;
ответ 404 удаляет ранее отображённый текст из открытой страницы.

SEO получает опубликованную страницу через публичный сервисный интерфейс
page, без импорта page.repository. Sitemap получает keyset-порции тем же
интерфейсом. Published: body_text, WebPage, canonical, стандартная обложка
площадки. Draft/deleted: SEO 404, noindex, без содержания. Проверить
prerender gateway на новом пути. Админские маршруты noindex с пустым body_text.

### Совместимость и выкладка

Миграция pages добавляет таблицы/enum. Дополнительная миграция `20261013_remove_about.sql`
удаляет `settings.about`, ключ `seo.pages.about` и обновляет default SEO в БД.
Перед её применением нужен резервный снимок БД. Контракт настроек меняется:
миграция, contracts, content-service и web обновляются согласованно.
При выделении общего документа обязательны
регрессионные проверки редактора статей, их рендера и SEO. Незакоммиченные
UI-изменения пользователя учитываются при реализации и не откатываются.

Выкладка: совместимые contracts/миграция/content → gateway → web. Новые
маршруты дополняют старые; старые потребители не требуют одновременного
релиза. Откат приложения оставляет добавленные таблицы. События страниц
не подписывают discussion, notification, поиск и ленты.

## Порядок реализации

1. **Контракты и модель**: DTO, ограничения, события, миграция, фикстуры
   и тесты схем; состояния, версии и уникальность адресов.
2. **Общий документ**: renderer/санитайзер, сохранение поведения статей,
   очистка caption, разделение чтения и подтверждения в Editor.js.
3. **Backend**: права, CAS, дедупликация, outbox, медиаполитика, чтение
   и список; интеграционные тесты владельца каждого правила.
4. **Gateway/SEO**: proxy prefixes, метаданные, sitemap, prerender,
   отсутствие утечки draft/deleted во всех публичных ответах.
5. **Интерфейс**: каталог, список, редакторы, preview, действия, диалог
   ухода, конфликт/401, переводы, mock handlers и stories.
6. **Приёмка**: [quickstart.md](./quickstart.md), регрессия редактора статей,
   админки и оболочки, бюджет бандла и сборка.

Backend обеспечивает самостоятельный API. UI может работать с согласованными
mock-контрактами после шага 1. Подробные задачи формируются следующим этапом.

## Constitution Check — после Phase 1

| Принцип | Проверка готового дизайна | Статус |
| --- | --- | --- |
| I | Обе таблицы принадлежат content; page/seo через публичный API модуля; файлы через media; outbox и ответ повтора атомарны | PASS |
| II | Нет feature → widget и entity → sibling entity; renderer в shared, страницы компонуют editor и действия | PASS |
| III | Нет новых токенов/хранилищ; 401 сохраняет форму; локальный preview очищается до DOM | PASS |
| IV | DTO/ошибки/лимиты/CAS/идемпотентность и проверки определены; публикация подтверждается сервером | PASS |
| V | Единственный ShellLayout, прежняя геометрия, существующий Compose/NATS/файловое хранилище | PASS |

Отклонений от конституции нет. Проверка относится к дизайну; реализация
и выполнение перечисленных тестов ещё не выполнялись.

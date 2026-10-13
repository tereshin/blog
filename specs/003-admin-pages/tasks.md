# Tasks: Простые страницы в админке

## Phase 1 — Setup

- [X] T001 Проверить инструкции, требования и текущие изменения в `.cursor/`, `specs/003-admin-pages/`, `.gitignore`, `.dockerignore`, `eslint.config.js`.

## Phase 2 — Foundation

- [ ] T002 Создать схемы DTO/лимитов и события в `packages/contracts/src/http/pages.ts`, `packages/contracts/src/events/content/page-*.v1.ts`; title 1–150, slug 3–40, ≤500 блоков, глубина ≤10.
- [ ] T003 Создать `pages` и `page_mutations` в `services/content-service/src/infra/db/schema.ts` и аддитивную миграцию; version от 1, slug уникален включая deleted.
- [ ] T004 Выделить общий санитайзер в `services/content-service/src/shared/editor-document/` и renderer в `apps/web/src/shared/ui/BlockRenderer.tsx`, мигрировать статью, проверить caption и embed URL.
- [ ] T005 Добавить чтение снимка и подтверждение записи в `apps/web/src/widgets/editor/`, без сброса новых правок предпросмотром.

## Phase 3 — US1 Создание и публикация

Independent test: сохранить черновик, переоткрыть, опубликовать, прочитать гостем.

- [ ] T006 [US1] Написать схемные и интеграционные проверки в `packages/contracts/test/pages.test.ts`, `services/content-service/test/integration/page.spec.ts`.
- [ ] T007 [US1] Реализовать repository/service/routes и outbox в `services/content-service/src/modules/page/`; только superadmin, CAS, стабильный replay, проверка файлов.
- [ ] T008 [US1] Подключить модуль в `services/content-service/src/app.ts` и prefixes в `services/gateway-service/src/modules/proxy/route-table.ts`.
- [ ] T009 [US1] Реализовать page API/query в `apps/web/src/entities/page/` и список/создание в `apps/web/src/features/manage-pages/`.
- [ ] T010 [US1] Добавить маршруты, каталог и переводы в `apps/web/src/app/routes/router.tsx`, `entities/admin/`, `widgets/admin/`, `shared/i18n/`.
- [ ] T011 [US1] Реализовать публичную страницу в `apps/web/src/pages/simple-page/` и SEO/sitemap через публичный интерфейс page в `services/content-service/src/modules/seo/`.

## Phase 4 — US2 Правки и предпросмотр

Independent test: preview без записи, save published, конфликт/401 без потери текста.

- [ ] T012 [US2] Реализовать редакторы и управление снимком в `apps/web/src/pages/admin-page-new/`, `pages/admin-page-edit/`, `features/manage-pages/`; read/ack, retry, конфликт и 401.
- [ ] T013 [US2] Добавить preview и предупреждение ухода в `apps/web/src/features/manage-pages/`; новая форма не перемонтируется после POST.
- [ ] T014 [US2] Проверить конкурентность, медиаполитику и повторы в `services/content-service/test/integration/page.spec.ts`, клиентские снимки в `apps/web/src/widgets/editor/`.

## Phase 5 — US3 Снятие и удаление

Independent test: unpublish, повторная публикация, отмена и подтверждение delete.

- [ ] T015 [US3] Реализовать UI unpublish/delete с подтверждением в `apps/web/src/features/manage-pages/`; закреплённый slug, soft delete, отсутствие утечек.
- [ ] T016 [US3] Проверить deleted/draft в public API, SEO и sitemap в `services/content-service/test/integration/page.spec.ts`.

## Phase 6 — Validation

- [ ] T017 Добавить mock API, stories и E2E в `apps/web/src/shared/api/mocks/handlers/pages.ts`, `apps/web/tests/e2e/admin-pages.spec.ts`, `apps/web/tests/e2e/pages.spec.ts`.
- [ ] T018 Выполнить lint/typecheck, тесты затронутых слоёв, регрессию статьи, web/build/storybook/size; записать результаты в `specs/003-admin-pages/quickstart.md`.

## Dependencies and execution

T001 → T002–T005 → US1 → US2 → US3 → Validation. Contracts до backend/UI.
Общий renderer и санитайзер меняются с миграцией потребителей. Возможна независимая
проверка backend и UI после согласования DTO; изменения общих файлов последовательны.
MVP начинается с полного US1; в этой реализации выполняются все три истории.

# Implementation Plan: Вход через Firebase, вид реакций и каркас страницы

**Branch**: `002-firebase-auth-layout` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-firebase-auth-layout/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Участник входит почтой и паролем, Google, GitHub и любым другим способом, который оператор включил в том же проекте Firebase Authentication. Браузер по-прежнему говорит только с `gateway`. Сессия площадки — HttpOnly-cookie, которую ставит `gateway` после того, как `identity-service` проверил токен Firebase или пароль и решил, открыть существующую учётную запись или создать новую. Одна подтверждённая почта — один участник. Регистрация почтой отвечает одним нейтральным `pending` и без cookie: занятый адрес не создаёт вторую строку и не сообщает, что он занят. Способ без подтверждённой почты оставляет ограниченную сессию; человек указывает адрес на площадке и подтверждает его письмом. В `local` и `dev` издатель — эмулятор Firebase Auth вместо `mock-google`; в `prod` эмулятора нет, а чужой издатель роняет старт `identity-service`.

Каркас остаётся одним layout-маршрутом. Меняется геометрия: полоса 1280px по центру, левый столбец 220, правый 320, два просвета по 16px внутри полосы, центр 708. Прокручивается страница. Шапка и видимые столбцы прилипают к окну. Кнопка поиска остаётся в шапке перед уведомлениями на всех ширинах. Ниже 1280 правый столбец скрыт и не встаёт под центр. Ниже 768 левая навигация открывается из шапки. Левый столбец — плоский список на фоне страницы, правый — стопка скруглённых карточек.

Суперадминистратор для каждой из четырёх реакций выбирает эмодзи или изображение. Владелец настройки — `content-service`. Счётчики и выбор человека остаются в `discussion-service`. Уже открытые страницы узнают о смене по кадру потока и перечитывают публичные настройки.

## Technical Context

**Language/Version**: TypeScript (strict) везде. Клиент — React 19, Vite, слои FSD в `apps/web`. Сервисы — Node.js 22 LTS, ESM, Fastify. pnpm workspaces. Новых сервисов нет.

**Project Type**: Веб-приложение: клиент `apps/web` и сервисы за `gateway`. Нового сервиса и второго клиента нет.

**Primary Dependencies**: Существующий стек фичи 001. Добавляется `firebase` (только `firebase/auth`) в `apps/web` — динамический импорт при открытии панели входа, не в начальном бандле. `firebase-admin` в `identity-service` для проверки ID-токена, создания пользователя почтой и удаления осиротевшей учётки Firebase. `openid-client` и контейнер `mock-google` с этого объёма уходят: их место занимает эмулятор Firebase Auth в `local` и `dev`. Клиентский SDK не пишет токен в `localStorage` или IndexedDB: только `initializeAuth(..., { persistence: inMemoryPersistence })`.

**Storage**: База `identity`: у `users` появляются `email_verified` и уникальная почта, пустая, пока адрес не указан или не пришёл подтверждённым; `google_sub` заменяется таблицей `auth_identities` (несколько способов на одну учётную запись). Сессии не меняют носитель — строка `sessions` и cookie `gateway`. База `content`: у настроек площадки четыре вида реакций (эмодзи или адрес изображения). База `discussion` не хранит картинку. Браузер по-прежнему без секретов: query-кэш в памяти, тема в `localStorage`, прокрутка ленты в `sessionStorage`. Веб-ключ Firebase для OAuth приходит ответом `GET /v1/auth/config` в память вкладки и в бандл как `VITE_*` не вшивается. Приватный ключ сервисного аккаунта живёт только в окружении `identity-service`.

**Testing**: Vitest unit без базы — решение о входе (`decideSignIn`), нейтральный ответ регистрации и указания почты, один эмодзи. Длины полосы считает e2e. Integration на PostgreSQL: слияние по подтверждённой почте, гонка двух созданий, закрытая регистрация, занятый адрес не создаёт строку и отвечает тем же `pending`, суперадминистратор, неподтверждённая почта не сливается, указанный чужой адрес не привязывается, вид реакции не меняет счётчик. Контракт: `content.settings.updated` v1 с новым необязательным полем и схемы HTTP в `packages/contracts`. Storybook: ряд реакций с эмодзи, с изображением, с несработавшей картинкой; шапка и столбцы на трёх ширинах, кнопка поиска перед уведомлениями. Playwright против `local`: почта через эмулятор, каркас на 1440 / 1280 / 1279 / 1024 / 390, настройки реакций. `pnpm test:infra`: в `prod` нет эмулятора и нет `mock-google`. Начальный JS остаётся ≤ 200 KB gzip — SDK входа в этот бюджет не входит.

**Target Platform**: Тот же браузер и те же контейнеры Compose. Широкий экран — окно от 1280px, планшет — 768–1279, телефон — ниже 768. Отдельного приложения для телефона нет. `prod` по-прежнему публикует только порты клиента и `gateway`.

**Performance Goals**: Обмен токена на cookie не добавляет hop длиннее `gateway → identity`. Письмо подтверждения и сброс пароля уходят в запросе, который их создал; повторная отправка не обязана уложиться в отдельный бюджет. Смена картинки реакции доходит до уже открытой вкладки тем же потоком, что и остальные кадры (сигнал + перечитывание `GET /v1/settings`), без перепубликации статей. Прокрутка страницы не возвращает внутренний скролл всего окна в одну колонку на широком экране: боковой столбец, который выше места под шапкой, крутится сам.

**Constraints**: Конституция 1.0.0 ещё требует вход только через Google OIDC и складывание каркаса ниже 1200px. Эта фича заменяет оба правила; поправка конституции до 2.0.0 — обязательна до слияния, текст — [research.md](./research.md), решение 1. Cookie, CSRF, запрет секретов в `VITE_*`, запрет IndexedDB и запрет обходного эндпоинта входа сохраняются. Пароль и `id_token` не логируются (пути уже в `REDACT_PATHS`, их дополняют тела `/v1/auth/*`). Цепочка не длиннее двух переходов. Мутации с `X-Idempotency-Key`. Изображение реакции — тот же приём, что логотип: `POST /v1/media?kind=image` (JPEG/PNG/WebP/GIF, до 8 МБ) и `assertMediaUrl`. Рекламный блок прототипа на площадку не переносится.

**Scale/Scope**: Те же 7 сервисов и 6 баз. Меняются `identity-service`, `gateway-service` (cookie на POST и CSP), `content-service` (вид реакций), клиент (`features/login`, `widgets/shell`, `entities/reaction`, `features/update-settings`) и проверки `email_verified` в `content`, `discussion`, `messaging`. Нового сервиса, второй оболочки и второго хранилища сессии нет.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Конституция `.specify/memory/constitution.md` версии 1.0.0. Расхождение с ней записано в Complexity Tracking; без поправки из [research.md](./research.md) слияние блокируется, даже если код уже совпадает со спецификацией.

| Принцип | Что проверяется в этой фиче | Статус |
| --- | --- | --- |
| I. Владение данными | Учётная запись и способы входа — таблицы `identity`. Вид реакции — настройка `content`. Кто какую реакцию поставил — по-прежнему `discussion`. Сервисы чужие таблицы не читают. Событие настроек уходит через outbox. Синхронно только `gateway → identity` и `gateway → content` | PASS |
| II. Слои клиента | Панель входа — `features/login`. Каркас — `widgets/shell`, один раз в layout-маршруте. Вид реакции читает `entities/reaction` из `entities/settings`. Запросы через `@/shared/api`. Firebase SDK не в `shared/` и не в `app/`. `import.meta.env` для ключей Firebase не читается | PASS |
| III. Сессия и секреты | Cookie HttpOnly ставит `gateway`. CSRF double-submit. Токен Firebase только в памяти на время обмена, затем `signOut`. IndexedDB и `localStorage` для токена не используются. Приватный ключ и серверный API-ключ не в `VITE_*` и не в репозитории. Обходного `POST /v1/auth/dev-login` нет | PASS по сессии; отклонение по правилу «только Google OIDC» — Complexity Tracking |
| IV. Контракты и проверяемость | Новые тела и ответы — zod в `packages/contracts`. `email_verified` добавляется в служебный контекст со значением по умолчанию `true`, если поля нет (старый JWT живёт не дольше 60 с). Поле вида реакций в `content.settings.updated` v1 необязательное. Правило входа и правило «один эмодзи» покрыты unit-тестом; слияние и доступ — integration; путь из quickstart — e2e | PASS |
| V. Один каркас и состав `infra/` | Один layout. Эмулятор Firebase Auth заменяет `mock-google` и есть только в `local` и `dev`. В `prod` контейнеров по-прежнему нет сверх списка фичи 001. Redis, прокси и отдельное приложение телефона не появляются | PASS по составу; отклонение по порогу 1200px и прокрутке центра — Complexity Tracking |

- До Phase 0: PASS с тремя записанными отклонениями. Неразрешённых NEEDS CLARIFICATION нет: развилка «SDK в браузере или обмен на сервере» закрыта в исследовании до записи контрактов.
- После Phase 1: PASS с теми же тремя отклонениями. Дизайн не добавил вторую сессию, второй каркас, новый сервис и хранение токена в браузере. Нейтральный `pending` регистрации и `POST /v1/auth/email-claims` остаются в `identity` и cookie чужой учётки не ставят. Поправка конституции и правка `.cursor/rules/session-security.mdc` остаются условием слияния, а не следствием уже изменённого файла конституции.

## Project Structure

### Documentation (this feature)

```text
specs/002-firebase-auth-layout/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth.md          # вход Firebase, сессия, письма, эмулятор
│   ├── shell.md         # полоса 1280, прокрутка страницы, пороги 768 и 1280
│   └── reactions.md     # эмодзи или изображение четырёх реакций
└── tasks.md             # Phase 2 (/speckit-tasks) — этот командой не создаётся
```

Контракты фичи 001 остаются историческими. Где они расходятся с этой фичей (`contracts/access.md` про один Google, `contracts/shell.md` про 1200px и прокрутку центра), источник правды — контракты этого каталога.

### Source Code (repository root)

```text
apps/web/src/
├── features/login/                      # панель: почта, кнопки провайдеров, обмен токена, письма, указание почты
│   ├── ui/LoginDialog.tsx
│   ├── model/useLoginDialog.ts
│   └── lib/firebase-auth.ts             # динамический импорт, inMemoryPersistence, signOut после обмена
├── features/update-settings/            # к форме настроек — четыре реакции
├── entities/session/                    # в пользователе сессии появляется email_verified
├── entities/settings/                   # публичные настройки включают вид реакций
├── entities/reaction/                   # картинка из настроек, запасной текст при ошибке загрузки
├── widgets/shell/ui/Shell.tsx           # полоса, липкие столбцы, прокрутка документа
├── widgets/shell/ui/SiteHeader.tsx      # кнопка меню только ниже 768; поиск перед уведомлениями на всех ширинах
├── widgets/shell/ui/LeftNav.tsx         # список на фоне страницы, без карточки
└── widgets/shell/ui/RightRail.tsx       # карточка 320; ниже 1280 её нет в потоке

services/identity-service/src/
├── config/env.ts                        # FIREBASE_*; в prod запрещены эмулятор и чужой издатель
├── modules/auth/                        # decideSignIn, регистрации, сессии, письма, email-claims; google-client удаляется
└── infra/db/migrations/                 # users.email_verified, unique email, auth_identities, снятие google_sub

services/gateway-service/src/modules/
├── session/session.routes.ts            # POST сессии ставит cookie; /v1/auth/google уходит
├── security/content-security-policy.ts  # connect-src и frame-src для Firebase и окна провайдера
└── events/events.service.ts             # кадр settings на content.settings.updated

services/content-service/src/modules/settings/   # вид четырёх реакций, тот же PUT /v1/settings
services/content-service, discussion-service, messaging-service
└── проверка email_verified на мутациях участника (предикат в packages/contracts)

packages/contracts/src/http/             # auth, settings, context
packages/logger/                         # redact тел /v1/auth/*

infra/
├── compose/                             # firebase-auth вместо mock-google в local и dev; в prod ни того ни другого
├── env/*.env.example                    # заглушки FIREBASE_*, без значений проекта
└── mock-google/                         # удаляется вместе с маршрутом, который на него ведёт
```

**Structure Decision**: Новая способность входит в уже существующие границы. `identity-service` остаётся единственным владельцем участника и сессии и единственным процессом, который видит приватный ключ Firebase. `gateway` по-прежнему только ставит cookie, проксирует и отдаёт поток. Вид реакции — поле настроек `content`, потому что его меняет тот же суперадминистратор, что и логотип, и потому что смена картинки не должна переписывать строки реакций. Клиент не получает нового слоя: панель — feature, геометрия — widget `shell`, который уже смонтирован в корневом layout.

## Complexity Tracking

| Отклонение | Зачем | Почему не проще |
| --- | --- | --- |
| Принцип III: «вход только Google OIDC», издатель `https://accounts.google.com`, контейнер `mock-google` | Спецификация 002 прямо заменяет один Google на Firebase Authentication: почта, Google, GitHub и остальные включённые способы одного проекта. Сессия, cookie и запрет секретов в бандле не меняются | Оставить один Google — отказаться от фичи. Отдельный OAuth на каждый провайдер в `identity-service` не покажет способ, который оператор включил только в консоли Firebase. Поправка конституции до 2.0.0 — [research.md](./research.md), решение 1 |
| Принцип V: ниже 1200px каркас складывается в одну колонку, на широком экране прокручивается центр | Спецификация 002 задаёт полосу 1280, столбцы 220 и 320, прокрутку страницы и скрытие правого столбца ниже 1280 без переноса под центр. Планшет 768–1279 оставляет левый столбец | Порог 1200 и внутренний скролл центра — это как раз то, что фича считает неправильным каркасом. Поправка — решение 1 того же исследования |
| Контейнер эмулятора Firebase Auth в `local` и `dev` вместо `mock-google` | FR-013: тестовый участник без настоящего поставщика, один и тот же код сессии во всех окружениях | Обходной эндпоинт входа под флагом по-прежнему запрещён. Эмулятор подменяет издателя токена так же, как `mock-google` подменял издателя Google. В `prod` контейнера нет, старт с `FIREBASE_AUTH_EMULATOR_HOST` запрещён |

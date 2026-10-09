---

description: "Task list for Вход через Firebase, вид реакций и каркас страницы"
---

# Tasks: Вход через Firebase, вид реакций и каркас страницы

**Input**: Design documents from `/specs/002-firebase-auth-layout/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/ (auth.md, shell.md, reactions.md), quickstart.md

**Tests**: spec.md не просит TDD отдельной фразой. Тесты включены, потому что их явно называет plan.md (раздел Testing) и принцип IV конституции: unit без базы для `decideSignIn`, нейтрального `pending` и одного эмодзи; integration на PostgreSQL для слияния, гонки, закрытой регистрации, занятого адреса, неподтверждённой почты и вида реакции; Storybook для ряда реакций и шапки на трёх ширинах; Playwright против `local` по quickstart.md; `pnpm test:infra` — в `prod` нет эмулятора и нет `mock-google`. Контракты фичи 001 не править: где они расходятся, источник правды — контракты этого каталога.

**Organization**: Задачи сгруппированы по пользовательским историям spec.md (US1–US5). Фазы 1–2 — общее, без чего истории не стартуют. Внутри истории тесты идут первыми и должны падать до реализации той же истории.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Можно выполнять параллельно (другие файлы, нет зависимости от незавершённых задач)
- **[Story]**: К какой истории относится задача (US1…US5)
- Каждая задача называет точные пути файлов

## Path Conventions

Монорепо pnpm workspaces по plan.md. Новых сервисов нет.

- Клиент: `apps/web/src/{features/login,features/update-settings,entities/session,entities/settings,entities/reaction,widgets/shell,pages}`, тесты `apps/web/tests/e2e`, истории `apps/web/src/**/*.stories.tsx`
- `identity-service`: `services/identity-service/src/{config/env.ts,modules/auth,infra/db,seed,bootstrap.ts}`
- `gateway-service`: `services/gateway-service/src/modules/{session,security,events}`
- `content-service`: `services/content-service/src/modules/settings`
- Предикат почты: `packages/contracts/src/access/`
- Окружение: `infra/compose/`, `infra/env/`, `infra/docker/`, `infra/scripts/`
- Поля JSON и колонки — `snake_case`. Мутации принимают `X-Idempotency-Key`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Поправка ворот конституции, зависимости Firebase и заглушки окружения. Код историй на это не опирается, но без поправки слияние блокируется.

- [x] T001 Поднять конституцию до 2.0.0 в `.specify/memory/constitution.md` (MAJOR: переопределены ворота принципов III и V; **Ratified** остаётся 2026-10-08; **Last Amended** — день правки). В начале файла на время ревью оставить Sync Impact Report и удалить его перед коммитом. Заменить абзац принципа III «Вход — только Google OIDC…» дословно на: «Вход — Firebase Authentication проекта площадки: почта с паролем, Google, GitHub и любой другой способ, включённый в том же проекте. Сессия площадки — cookie `gateway`. Токен Firebase в браузере не хранится. Обходного эндпоинта входа нет ни под каким флагом. В `local` и `dev` издателем может быть эмулятор Firebase Auth; контейнер эмулятора есть только там. В `prod` `identity-service` не стартует, если задан эмулятор или издатель ID-токена отличается от `https://securetoken.google.com/<FIREBASE_PROJECT_ID>`. Код входа и сессий один во всех окружениях. Приватный ключ сервисного аккаунта и серверный ключ API в репозиторий и в `VITE_*` не попадают.» Заменить абзац принципа V про одну оболочку и 1200px дословно на: «Публичные разделы и администрирование живут в одной оболочке. Маршрутизатор меняет только центр. Шапка и те боковые столбцы, которые видны на этой ширине, остаются смонтированными при переходе и присутствуют в первом кадре прямой ссылки. На ширине от 1280px содержимое — полоса 1280px по центру окна: левый столбец 220px, правый 320px, просветы входят в 1280. Прокручивается страница; шапка и видимые столбцы остаются на экране. Пустой правый столбец на этой ширине сохраняет 320px. Ниже 1280px правый столбец скрыт и не переносится под центр. От 768 до 1279px левый столбец 220px остаётся. Ниже 768px одна колонка, левая навигация открывается из шапки. Отдельного приложения для телефона нет.» Абзац «Всё инфраструктурное лежит в `infra/`…» не ослаблять. В `.cursor/rules/session-security.mdc` добавить абзац того же смысла (cookie `gateway`, токен Firebase не хранится, обходного входа нет, эмулятор только в `local` и `dev`); запреты `localStorage` / IndexedDB / `VITE_*` для секретов не ослаблять

- [x] T002 [P] Добавить зависимость `firebase` в `apps/web/package.json` (в коде импортируется только `firebase/auth`, динамическим `import()` при открытии панели, не в начальном бандле) и `firebase-admin` в `services/identity-service/package.json`. Удалить `openid-client` из `services/identity-service/package.json`. `import.meta.env` для ключей Firebase не читать: веб-ключ приходит только `GET /v1/auth/config`

- [x] T003 [P] В `infra/env/local.env.example`, `infra/env/dev.env.example`, `infra/env/prod.env.example` и `infra/env/local.host.env.example` удалить `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_ISSUER_URL`. Добавить заглушки `FIREBASE_PROJECT_ID`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_WEB_API_KEY`, `FIREBASE_SERVER_API_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. `SEED_AUTH_PASSWORD` и `FIREBASE_AUTH_EMULATOR_HOST` — только в `local` и `dev` (эмулятор ожидаемо на порту 9099, проект `demo-blog`). В `prod` этих двух переменных нет. Значения секретов — `CHANGE_ME`, реальные значения проекта в репозиторий не класть

- [x] T004 [P] В `packages/logger/src/index.ts` дополнить `REDACT_PATHS`: уже стоят `req.body.password` и `*.id_token`; добавить `*.oob_code` и пути тел `/v1/auth/*`, чтобы пароль, `id_token` и `oob_code` не попадали в журнал. Обновить unit-тест пакета логгера, если он перечисляет пути redact

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Контракты, схема identity, чистое решение о входе, cookie на `POST` сессии, CSP и замена `mock-google` эмулятором. Истории US1–US5 начинаются только после этой фазы.

**⚠️ CRITICAL**: Ни одна история не начинается, пока эта фаза не закончена

- [x] T005 Добавить `email_verified` в `packages/contracts/src/http/context.ts`: в `serviceContextSchema` и `serviceJwtClaimsSchema` поле `email_verified` — boolean, значение по умолчанию `true`, если поля нет (старый JWT живёт не дольше 60 с). `claimsToContext` и `contextToClaims` переносят фактическое значение. Новый identity всегда пишет факт. Гость остаётся без требования подтверждения. Обновить вызовы в `services/gateway-service/src/modules/session/session.service.ts`: `guestContext` и `memberContext` согласованы со схемой; `sessionInfoSchema` читает `email_verified` из `GET /internal/sessions/{id}`

- [x] T006 [P] Расширить `packages/contracts/src/http/auth.ts` и реэкспорт в `packages/contracts/src/http/index.ts` схемами контракта `contracts/auth.md`: `GET /v1/auth/config` (`api_key`, `auth_domain`, `project_id`, `providers: { id }[]`, `emulator_host` или `null`; `test_participants` и `test_password` только вместе с заданным `emulator_host`); `POST /v1/auth/registrations` тело `email`, `password`, успех `{ status: 'pending' }`; `POST /v1/auth/sessions` — дискриминант `method: 'password'` (`email`, `password`) или `method: 'id_token'` (`id_token`); `POST /v1/auth/email-claims` тело `email`, успех `{ status: 'pending' }`; `POST /v1/auth/email-verifications`; `POST /v1/auth/email-verification-confirmations` тело `oob_code`; `POST /v1/auth/password-resets` тело `email`; `POST /v1/auth/password-reset-confirmations` тело `oob_code`, `password`. В `sessionUserSchema` / ответ `GET /v1/auth/session` для участника добавить свою `email` (строка или `null`) и `email_verified`. Схемы callback `GET /v1/auth/google` пометить неиспользуемыми или удалить из публичного экспорта, маршрутов больше нет

- [x] T007 [P] В `packages/contracts/src/http/settings.ts` описать вид реакции: `kind` только `laugh` | `heart` | `thumb` | `fire`; `presentation` только `emoji` | `image`; `emoji` обязателен при `emoji`; `image_url` обязателен при `image`. `reaction_appearances` — ровно четыре объекта в порядке `laugh`, `heart`, `thumb`, `fire` на `publicSettingsSchema` и `updateSettingsSchema` (частичное тело по-прежнему отвергается: схема строгая). В `packages/contracts/src/events/content/settings-updated.v1.ts` поле `reaction_appearances` необязательное, чтобы потребитель флагов регистрации не отвергал конверт v1. HTTP-ответ настройки поле содержит всегда

- [x] T008 [P] Добавить предикат `requireVerifiedEmail` в `packages/contracts/src/access/require-verified-email.ts` и экспорт из `packages/contracts/src/index.ts`: мутация участника при `email_verified === false` отклоняется кодом `email_unverified`. Гость и чтение публичного предикат не вызывают. Ограничение участника этот предикат не подменяет: вызывающий проверяет ограничение раньше. Unit-тест `packages/contracts/test/require-verified-email.test.ts`: ложь → отказ, истина → пропуск, отсутствие поля после разбора схемы с умолчанием `true` → пропуск

- [x] T009 Миграция `services/identity-service/src/infra/db/migrations/` и Drizzle-схема `services/identity-service/src/infra/db/schema.ts`. У `users`: колонка `email` пустая, пока способ входа не принёс подтверждённый адрес и человек не указал адрес на площадке; регистрация почтой пишет адрес сразу, но `email_verified` остаётся ложью до письма; `email` уникальна в нижнем регистре, пустых строк может быть несколько; `email_verified` — ложь, пока письмо площадки или подтверждённый адрес поставщика не закрыли её; неподтверждённый адрес из токена в `email` и в `email_verified` не копируется. Новая таблица `auth_identities(id, user_id, firebase_uid unique, provider_id, created_at)`: `provider_id` — `password`, `google.com`, `github.com` или другой идентификатор токена; почта на этой строке не хранится; несколько строк на одного `user_id` допустимы. Существующие `google_sub` переносятся одной миграцией (`provider_id = google.com`, `firebase_uid = google_sub`), затем колонка `google_sub` снимается. Пустой `google_sub` суперадминистратора до первого входа означает ноль строк в `auth_identities`. Таблица `auth_states` удаляется. Обновить `services/identity-service/src/bootstrap.ts`: строка `bootstrap-prod` создаётся с почтой `SUPERADMIN_EMAIL`, без строки `auth_identities` и без колонки `google_sub`

- [x] T010 Переписать `services/identity-service/src/config/env.ts`: убрать `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_ISSUER_URL` и `GOOGLE_PROD_ISSUER`. Читать `FIREBASE_PROJECT_ID`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_WEB_API_KEY`, `FIREBASE_SERVER_API_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. `FIREBASE_AUTH_EMULATOR_HOST` и `SEED_AUTH_PASSWORD` допустимы только при `APP_ENV` `local` или `dev`. В `prod` процесс не стартует, если задан `FIREBASE_AUTH_EMULATOR_HOST`, если издатель ID-токена отличается от `https://securetoken.google.com/<FIREBASE_PROJECT_ID>`, если секрет равен `CHANGE_ME`, или если конфигурация отдала бы `test_password`. Обновить `services/identity-service/test/unit/env.test.ts`

- [x] T011 [P] Заменить `decideAccount` на чистую функцию `decideSignIn` в `services/identity-service/src/modules/auth/auth.policy.ts` по таблице research.md решение 3, до любой записи: уже есть uid и подтверждённая почта того же участника → вход, имя и аватар профиля не меняются; уже есть uid и подтверждённая почта другого участника → вход в учётку, к которой уже привязан uid, её почта не подменяется, uid к чужой учётке не переносится, вторая строка не создаётся, экран не говорит, что адрес занят; нет uid и почта подтверждена и совпала → вход в эту учётку, uid дописывается, роль и ограничение остаются, в том числе при закрытой регистрации и для строки `bootstrap-prod`; нет uid, почта подтверждена и ничья, регистрация открыта → новый участник; нет uid и регистрация закрыта → отказ `registration_closed` и если почта подтверждена, но ещё ничья, и если её нет, строка участника не создаётся; нет uid и почта не подтверждена и регистрация открыта → новый участник с сессией, `email` пустая, `email_verified = false`, неподтверждённый адрес из токена в `users.email` не пишется. Стартовое имя — не длиннее 50 символов: имя поставщика, для одной только почты — часть адреса до `@`. Повторный вход имя и аватар не перезаписывает. Unit-тесты всех строк таблицы в `services/identity-service/test/unit/auth.policy.test.ts`. Регистрация почтой в эту функцию не входит

- [x] T012 Реализовать клиент Firebase Admin в `services/identity-service/src/modules/auth/firebase-admin.ts` (проверка ID-токена: издатель, аудитория, срок; создание пользователя почтой; удаление пользователя Firebase только если его uid ни к кому не привязан; отправка письма подтверждения и сброса). Длина пароля (не короче 8) и форма адреса проверяются до вызова Firebase. Закрытая регистрация проверяется до создания пользователя Firebase. Чужой проект и просроченный токен — отказ, строка не создаётся. Обрыв связи после успешной записи строку не откатывает и пользователя Firebase не удаляет

- [x] T013 В `services/gateway-service/src/modules/session/session.routes.ts` успех `POST /v1/auth/sessions` ставит cookie через существующий `setSessionCookie` (`HttpOnly; Secure; SameSite=Lax; Path=/`); `session_id` в браузер не возвращается. Регистрация и подтверждение письма cookie не ставят. Удалить обработчик `GET /v1/auth/google/callback`. `identity-service` cookie браузера не видит. Обновить `services/gateway-service/test/unit/route-table.test.ts` и `services/gateway-service/test/unit/security.test.ts`, если они ещё ждут `/v1/auth/google`

- [x] T014 [P] В `services/gateway-service/src/modules/security/content-security-policy.ts` и `infra/docker/web.nginx.conf` оставить политику без `unsafe-inline` и `unsafe-eval`. К `connect-src` добавить `https://identitytoolkit.googleapis.com` и `https://securetoken.googleapis.com`. К `frame-src` добавить origin `auth_domain` и `https://accounts.google.com`, сохранив уже стоящий `https://github.com`. В `local` и `dev` к обоим спискам добавить origin эмулятора. Произвольный `https:` не разрешать. Обновить `services/gateway-service/test/unit/security.test.ts`

- [x] T015 [P] Заменить `mock-google` контейнером `firebase-auth`. Удалить сервис `mock-google` из `infra/compose/docker-compose.local.yml` и `infra/compose/docker-compose.dev.yml`; добавить `firebase-auth` (сборка `infra/docker/firebase-auth.Dockerfile`, только эмулятор Auth, порт из `FIREBASE_AUTH_EMULATOR_HOST`). В `infra/compose/docker-compose.prod.yml` нет ни `mock-google`, ни `firebase-auth`. В `infra/compose/docker-compose.yml` у `identity` заменить `GOOGLE_*` на `FIREBASE_*`. Удалить каталог `infra/mock-google/` и строку `infra/mock-google` из `pnpm-workspace.yaml`. В `infra/scripts/lib/compose.ts`, `infra/scripts/up.ts` и `infra/scripts/test/compose.test.ts` запрет `prod` распространить на оба имени: `pnpm test:infra` падает, если в `prod` есть `mock-google` или `firebase-auth`, и проходит, когда в `local` и `dev` есть `firebase-auth` и нет `mock-google`

**Checkpoint**: Контракты собираются, миграция identity применяется, `decideSignIn` покрыт unit-тестами, `pnpm test:infra` зелёный. Истории можно вести параллельно

---

## Phase 3: User Story 1 — Войти или зарегистрироваться почтой, Google или GitHub (Priority: P1) 🎯 MVP

**Goal**: При открытой регистрации новый человек создаёт учётную запись почтой и паролем, Google или GitHub. Уже созданный входит тем же способом в ту же учётную запись. После входа в браузере остаётся только cookie сессии площадки. Гость читает публичное без входа.

**Independent Test**: При открытой регистрации создать учётную запись почтой (через эмулятор), выйти и войти тем же адресом — имя и материалы те же. Пароль короче 8 символов и адрес без `@` учётку не создают. Занятый адрес отвечает тем же `{ status: 'pending' }` без второй строки. При закрытой регистрации новый адрес и первый вход Google/GitHub учётку не создают, уже созданный входит. Перезагрузка оставляет участника, секрет Firebase в хранилище браузера не появляется.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T016 [P] [US1] Переписать `services/identity-service/test/integration/auth.spec.ts` под контракт auth.md, чтобы тесты падали до реализации: открытая регистрация свободного адреса — `200` `{ status: 'pending' }` без `Set-Cookie`, строка с `email_verified = false`, имя профиля — часть адреса до `@` не длиннее 50 символов; пароль короче 8 символов и адрес не похож на почту — отказ у поля, пользователя Firebase нет, строки участника нет; занятый адрес — тот же `pending`, второй строки нет, письмо не уходит, текст не говорит, что адрес занят и не предлагает войти; закрытая регистрация — один `registration_closed` и для нового, и для уже существующего адреса, по ответу не видно, занят ли адрес; `POST /v1/auth/sessions` с `method: password` и верным паролем неподтверждённой почты открывает сессию с `email_verified = false`; неверный пароль и неизвестный адрес — один `invalid_credentials`; `POST /v1/auth/email-verification-confirmations` с кодом эмулятора ставит `email_verified = true` и сам сессию не открывает; `POST /v1/auth/password-resets` на адрес, которого нет, отвечает тем же успехом, что и на адрес, который есть; новый пароль короче 8 символов не сохраняется; `GET /v1/auth/google` и `GET /v1/auth/google/callback` отсутствуют; повтор регистрации с тем же `X-Idempotency-Key` второй строки не создаёт

- [x] T017 [P] [US1] Заменить `apps/web/tests/e2e/auth.spec.ts` и удалить сценарий `mock-google` из `apps/web/tests/e2e/auth-mock-google.spec.ts`: против `local` регистрация почтой через эмулятор, вход, выход, повторный вход в тот же профиль; `POST /v1/auth/dev-login` отвечает 404; в `local` панель показывает участников seed и вход одним жестом; закрытие окна провайдера оставляет гостя на том же адресе; после входа `localStorage`, `sessionStorage` и IndexedDB не содержат токен Firebase; перезагрузка показывает того же участника. Тесты должны падать, пока панель ещё уходит на `/v1/auth/google`

### Implementation for User Story 1

- [x] T018 [US1] Переписать `services/identity-service/src/modules/auth/auth.repository.ts` и `auth.types.ts` на `users.email` / `email_verified` и `auth_identities` (`firebase_uid` уникален, `provider_id`, `user_id`). Удалить чтение и запись `google_sub`. Поиск входа: сначала строка `auth_identities` по `firebase_uid`, затем участник по подтверждённой почте в нижнем регистре

- [x] T019 [US1] Реализовать `POST /v1/auth/registrations` в `services/identity-service/src/modules/auth/auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`, `auth.schema.ts`: пароль короче 8 символов или адрес не похож на почту — отказ у поля до Firebase; регистрация закрыта — `registration_closed` и для нового, и для занятого адреса, строка не создаётся; регистрация открыта — всегда `200` `{ status: 'pending' }` без сессии и без cookie. Свободный адрес создаёт пользователя Firebase и строку участника (`email` записана, `email_verified = false`, имя — часть до `@`, не длиннее 50, один раз в `identity.user.created`). Занятый адрес не создаёт ни строку, ни пользователя Firebase и письмо не шлёт. Гонка двух регистраций на один свободный адрес: проигравший уникального индекса удаляет своего только что созданного и ни к кому не привязанного пользователя Firebase и отдаёт тот же `pending`. Повтор с тем же `X-Idempotency-Key` вторую строку не создаёт

- [x] T020 [US1] Реализовать `POST /v1/auth/sessions` в тех же файлах модуля `services/identity-service/src/modules/auth/`: `method: password` — верный пароль открывает сессию, в том числе при `email_verified = false`; неверный пароль и неизвестный адрес — один `invalid_credentials`. `method: id_token` — проверка токена через `firebase-admin.ts`, решение `decideSignIn`, запись `auth_identities`. Успех возвращает gateway идентификатор сессии для cookie и не кладёт его в тело ответа браузеру. `GET /v1/auth/session` и `GET /internal/sessions/{id}` отдают `email` (или `null`) и `email_verified`. Выход остаётся `POST /v1/auth/logout`. Удалить `services/identity-service/src/modules/auth/google-client.ts` и маршруты `GET /v1/auth/google`, `GET /v1/auth/google/callback` из `auth.routes.ts`

- [x] T021 [US1] Реализовать письма в `services/identity-service/src/modules/auth/`: `POST /v1/auth/email-verifications` при сессии всегда успех и не сообщает, ушло ли письмо (почты на строке нет — письма нет, ответ тот же); `POST /v1/auth/email-verification-confirmations` без обязательной сессии, тело `oob_code`, принятый код ставит `email_verified = true` строке с этим uid и сессию не открывает, чужой и просроченный код учётку не подтверждают и не сообщают, чья она; `POST /v1/auth/password-resets` всегда один и тот же успех; `POST /v1/auth/password-reset-confirmations` не сохраняет пароль короче 8 символов и на негодный код отказывает без сведений об учётке. Все мутации принимают `X-Idempotency-Key`

- [x] T022 [US1] Реализовать `GET /v1/auth/config` в `services/identity-service/src/modules/auth/`: список `providers` из конфигурации проекта Firebase, кэш в памяти процесса 60 с. Поля `api_key` (веб-ключ, не секрет сессии), `auth_domain`, `project_id`, `emulator_host` или `null`. Только при заданном `emulator_host` дополнительно `test_participants` (адреса и подписи seed) и `test_password` из `SEED_AUTH_PASSWORD`. В `prod` этих полей нет. Ошибка загрузки конфигурации на клиенте не меняет раздел под панелью

- [x] T023 [P] [US1] Вызывать `requireVerifiedEmail` после проверки ограничения и до мутации в `services/content-service/src/modules/article/article.service.ts` (публикация), `services/content-service/src/modules/follow/follow.service.ts` (подписка), `services/content-service/src/modules/profile/profile.service.ts` (правка профиля). Отказ `email_unverified` с объяснением. Если участник и ограничен, и не подтверждён — текст про ограничение. Чтение публичного не отклонять

- [x] T024 [P] [US1] Вызывать `requireVerifiedEmail` тем же порядком в `services/discussion-service/src/modules/comment/comment.service.ts`, `services/discussion-service/src/modules/reaction/reaction.service.ts` и `services/discussion-service/src/modules/bookmark/bookmark.service.ts`

- [x] T025 [P] [US1] Вызывать `requireVerifiedEmail` тем же порядком в `services/messaging-service/src/modules/message/message.service.ts`

- [x] T026 [US1] Обновить seed identity: `services/identity-service/src/seed/seed.ts` и конфликт в `packages/seed-data` больше не пишут `google_sub`. Участники seed получают `email_verified = true` и строку `auth_identities` (`provider_id = password`). При заданном `FIREBASE_AUTH_EMULATOR_HOST` seed создаёт тех же пользователей в эмуляторе с паролем `SEED_AUTH_PASSWORD` и не коммитит пароль. Обновить `services/identity-service/test/integration/seed.spec.ts`, `services/identity-service/test/integration/bootstrap.spec.ts` и `infra/scripts/test/seed/seed-idempotency.test.ts`, убрав вставки `google_sub`. Сессий seed по-прежнему не создаёт

- [x] T027 [US1] Добавить `apps/web/src/features/login/lib/firebase-auth.ts`: динамический `import('firebase/auth')` при открытии панели, `initializeAuth(..., { persistence: inMemoryPersistence })`, для Google и GitHub — `signInWithPopup`, `getIdToken`, `POST /v1/auth/sessions` с `method: id_token`, сразу `signOut`. Токен не писать в `localStorage`, `sessionStorage`, IndexedDB и URL. Ключи брать только из `GET /v1/auth/config`, не из `import.meta.env`. Экспорт наружу только через `apps/web/src/features/login/index.ts`

- [x] T028 [US1] Переписать `apps/web/src/features/login/ui/LoginDialog.tsx` и `apps/web/src/features/login/model/useLoginDialog.ts`: форма почты и пароля, если в `providers` есть `password`; кнопки Google (`google.com`) и GitHub (`github.com`) с именем для читалки экрана; регистрация показывает нейтральный экран `pending` и не говорит, что адрес занят; поля объясняют пароль короче 8 символов и адрес не похож на почту; закрытая регистрация объясняет отказ; отмена окна, ошибка поставщика и обрыв оставляют тот же раздел и объясняют, что вход не завершён; панель проходится с клавиатуры и открывается поверх текущего раздела. Убрать `window.location.assign('/v1/auth/google?...')`

- [x] T029 [US1] Добавить страницу `apps/web/src/pages/auth-action/` (маршрут `/auth/action` в `apps/web/src/app/routes/router.tsx` внутри того же `ShellLayout`): читает `mode` и `oob_code` из query, отправляет на `email-verification-confirmations` или `password-reset-confirmations` и не оставляет код в новом адресе после отправки. Пароль короче 8 символов не отправляется как успех

- [x] T030 [US1] В `apps/web/src/entities/session/` (`api/get-session.ts`, `model/viewer.ts`, `model/useSession.ts`) принять `email` и `email_verified`. Пока почта не подтверждена, попытка комментировать, поставить реакцию, публиковать или написать показывает объяснение и не выполняет действие; читать публичное можно. Истёкшая сессия по-прежнему открывает панель поверх раздела и не стирает несохранённый текст. В `local` и `dev` панель входа показывает `test_participants` и входит выбранным адресом тем же `POST` пароля

**Checkpoint**: US1 проверяется отдельно на эмуляторе. Google и GitHub в бою — ручная проверка quickstart, не часть `pnpm test:e2e`

---

## Phase 4: User Story 2 — Узнать того же человека по другим способам входа (Priority: P1)

**Goal**: Любой способ, включённый в том же проекте Firebase, показан на той же панели и открывает одну учётную запись. Та же подтверждённая почта не создаёт второго участника. Способ без подтверждённой почты оставляет ограниченную сессию: человек указывает почту на площадке и подтверждает её письмом.

**Independent Test**: Участник, созданный с подтверждённой почтой, входит другим способом с той же подтверждённой почтой и видит тот же профиль. Способ без подтверждённой почты чужой профиль не открывает. Указание занятого адреса даёт тот же экран, что и указание свободного, адрес не привязывается, действия остаются закрытыми. Дополнительный id из `GET /v1/auth/config` виден кнопкой без настройки площадки.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T031 [P] [US2] Добавить в `services/identity-service/test/integration/auth.spec.ts` (отдельные `it`, не ломая сценарии US1) падающие проверки: два входа с одной новой подтверждённой почтой оставляют одну строку `users`, проигравший гонки уникального индекса привязывает свой `firebase_uid` к победителю; подтверждённая почта уже существующего участника дописывает uid и не создаёт вторую строку, роль и ограничение остаются; uid уже привязан к одному участнику, а подтверждённая почта указывает на другого — вход в учётку uid, почта той учётки не подменяется, вторая строка не создаётся; неподтверждённый адрес из токена не пишет `users.email` и чужую учётку не открывает; `POST /v1/auth/email-claims` на свободный адрес — `{ status: 'pending' }`, адрес записан, `email_verified` остаётся ложью, письмо уходит; на адрес другого участника — тот же `pending`, адрес не записан, письмо не уходит; повтор своего неподтверждённого адреса только шлёт письмо ещё раз; уже подтверждённая почта этим маршрутом не подменяется; непохожий на почту адрес — отказ у поля, строка не меняется; повтор с тем же `X-Idempotency-Key` чужой адрес не привязывает

- [x] T032 [P] [US2] Дополнить `apps/web/tests/e2e/auth.spec.ts` падающим сценарием: после входа с `email_verified = false` и пустой почтой форма указания адреса на площадке; отправка занятого адреса не отличается на экране от свободного и не открывает комментарий; после кода эмулятора на `/auth/action` тот же человек комментирует

### Implementation for User Story 2

- [x] T033 [US2] Реализовать `POST /v1/auth/email-claims` в `services/identity-service/src/modules/auth/auth.service.ts` и `auth.routes.ts` только при своей сессии и только пока своя почта не подтверждена. Непохожий на почту адрес — отказ у поля. Иначе всегда `{ status: 'pending' }`. Свободный адрес пишется в `users.email`, `email_verified` остаётся ложью, уходит письмо. Адрес другого участника не записывается и письмо не уходит. Повтор того же своего неподтверждённого адреса только отправляет письмо ещё раз. Уже подтверждённую почту маршрут не меняет. При `registration_closed` на `id_token`, если окно поставщика создало пользователя Firebase и uid ни к кому не привязан, удалить этого пользователя Firebase

- [x] T034 [US2] В `apps/web/src/features/login/lib/firebase-auth.ts` открывать любой id из `providers`, кроме `password`, через `OAuthProvider(id)` и то же `signInWithPopup`. Неизвестный id не прятать. В `apps/web/src/features/login/ui/LoginDialog.tsx` показать кнопку на каждый такой id с названием для читалки экрана, рядом с почтой, Google и GitHub

- [x] T035 [US2] В `apps/web/src/features/login/ui/LoginDialog.tsx` и `useLoginDialog.ts` для сессии с `email_verified = false` показать форму указания почты (`POST /v1/auth/email-claims`) и повтор письма (`POST /v1/auth/email-verifications`). Экран занятого адреса совпадает с экраном свободного и не сообщает, что адрес занят. Пока флаг ложный, действия участника остаются закрытыми (опора на T030)

- [x] T036 [US2] В `services/identity-service/src/modules/auth/auth.service.ts` повторный вход не публикует новый `identity.user.created` и не перезаписывает уже сохранённые имя и аватар профиля именем или картинкой поставщика. Стартовое имя уходит один раз, не длиннее 50 символов. Покрыть это проверкой в `services/identity-service/test/integration/auth.spec.ts`

**Checkpoint**: US1 и US2 проходят независимо: три основных способа и дополнительный id ведут в одну учётную запись, скрытая почта чужого участника не открывает

---

## Phase 5: User Story 3 — Читать в каркасе шириной 1280 с неподвижными шапкой и столбцами (Priority: P1)

**Goal**: На окне от 1280px полоса 1280 по центру, левый столбец 220, правый 320, два просвета по 16 внутри полосы, центр 708. Прокручивается страница. Шапка и оба столбца остаются. Состав блоков совпадает с контрактом shell.md. Реклама прототипа не появляется.

**Independent Test**: На окне 1440px открыть главную, длинную статью и профиль. Полоса 1280, левый 220, правый 320, просветы 16, центр 708. Прокрутка увозит текст, шапка и оба столбца остаются. Список тем выше места под шапкой крутится внутри левого столбца. Кнопка поиска в шапке сразу перед уведомлениями.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T037 [P] [US3] Добавить `apps/web/tests/e2e/shell-geometry.spec.ts`, падающий на текущем пороге 1200 и внутреннем скролле центра: при ширине 1440 полоса содержимого 1280 и стоит по центру, левый столбец 220, правый 320, оба `column-gap` 16, центр 708; прокрутка статьи двигает документ (`window`), шапка остаётся у верхнего края, оба столбца остаются; кнопка поиска в шапке непосредственно перед уведомлениями; длинное название обрезано одной строкой; «Наверх» возвращает документ в начало; блока «Подписка Plus» нет. Селектор `[data-shell-scroll="center"]` для прокрутки страницы не использовать

- [x] T038 [P] [US3] Обновить `apps/web/src/widgets/shell/ui/LeftNav.stories.tsx`, `RightRail.stories.tsx` и добавить историю шапки в `apps/web/src/widgets/shell/ui/SiteHeader.stories.tsx`: широкая ширина показывает три зоны, кнопка поиска перед уведомлениями, левый список без карточки-подложки, правый столбец — стопка скруглённых карточек с «Популярные комментарии». Истории должны описывать целевую вёрстку и падать, пока классы ещё завязаны на 1200px

### Implementation for User Story 3

- [x] T039 [US3] Переверстать `apps/web/src/widgets/shell/ui/Shell.tsx` и снять `html.shell-lock` из `apps/web/src/app/styles/globals.css`. Окно от 1280px: полоса `width: 1280px; margin-inline: auto`; колонки `220px minmax(0, 1fr) 320px`; `column-gap: 16px`; оба просвета входят в 1280, центр 708; поля окна по бокам — фон страницы. Прокручивается документ, не колонка центра. Шапка `position: sticky; top: 0`, высота 56px. Видимый боковой столбец: `position: sticky; top: 56px; max-height: calc(100dvh - 56px); overflow-y: auto; align-self: start`. Видимость столбцов задаёт CSS, не `matchMedia` после гидрации, чтобы прямой адрес в первом кадре показывал шапку и оба столбца. Удалить `WIDE_QUERY = '(min-width: 1200px)'` и переключение `shell-lock`. Смена раздела меняет центр и не размонтирует шапку; на этой ширине оба столбца остаются. Комментарии статьи остаются в центре

- [x] T040 [US3] Привести `apps/web/src/widgets/shell/ui/SiteHeader.tsx` и `apps/web/src/widgets/shell/ui/HeaderCenter.tsx` к одной строке высотой 56px: знак площадки; для раздела с названием — назад, название одной строкой с многоточием, обновление данных центра (сброс запросов центра, шапка не размонтируется); затем кнопка поиска, уведомления, «Написать», аватар. Кнопка поиска стоит сразу перед уведомлениями и не уезжает в центр шапки. На ширине от 1280px кнопка меню скрыта

- [x] T041 [P] [US3] В `apps/web/src/widgets/shell/ui/LeftNav.tsx` убрать карточку-подложку (`Card`): группы навигации со значками и подписями на фоне страницы, текущий пункт отмечен заметнее остальных, `aria`-имя — навигация. Переполнение крутит этот столбец, а не страницу

- [x] T042 [P] [US3] В `apps/web/src/widgets/shell/ui/RightRail.tsx` оставить стопку отдельных скруглённых карточек шириной 320. Обязательная карточка — «Популярные комментарии» (`aria`). Пустой столбец на ширине от 1280px остаётся 320 и сообщает, что показывать нечего, ширину центру не отдаёт. Других карточек не добавлять. Блок «Подписка Plus» и прочую рекламу прототипа не добавлять ни в один раздел

- [x] T043 [US3] В `apps/web/src/widgets/shell/ui/BackToTop.tsx` и `apps/web/src/widgets/shell/lib/feed-return.ts` крутить `window` и писать положение возврата в ленту из `window.scrollY` в тот же `sessionStorage`. «Наверх» доступен в каждом разделе после прокрутки вниз и не заменяет столбцы. Смена раздела ставит документ в начало, кроме возврата в ленту. Светлый и тёмный вид ширины не меняют

**Checkpoint**: На 1440px главная, статья и профиль совпадают с числами SC-005. Ниже 1280px ещё можно не прятать правый столбец — это US4

---

## Phase 6: User Story 4 — Скрыть правый столбец на планшете и телефоне (Priority: P2)

**Goal**: Ниже 1280px правого столбца нет ни сбоку, ни под центром. От 768 до 1279px левый столбец 220 остаётся, просвет до центра 16, центр забирает остаток окна. Ниже 768px одна колонка, левая навигация открывается одной кнопкой шапки. Кнопка поиска остаётся перед уведомлениями.

**Independent Test**: На 1024 и 390 открыть главную, статью и профиль. Правого столбца нет. На 1024 левый столбец виден и остаётся при прокрутке. На 390 навигация открывается из шапки на главной, в статье и в сообщениях. На 1279 правого столбца уже нет, на 1280 три столбца есть.

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T044 [P] [US4] Дополнить `apps/web/tests/e2e/shell-geometry.spec.ts` падающими проверками: 1280px — три столбца; 1279px — правого нет, в том числе под статьёй, обсуждение статьи в центре; 1024px — левый столбец 220 остаётся при прокрутке, просвет до центра 16, правого нет на главной, в профиле и в настройках, пустой правый столбец не оставляет карточку под центром, поиск перед уведомлениями; 390px — одна колонка, одна и та же кнопка шапки открывает левую навигацию на главной, в статье и в сообщениях, правого столбца нет, поиск перед уведомлениями. Прямой адрес статьи на 1440 показывает шапку и оба столбца до текста; на 390 в первом кадре правого столбца нет

### Implementation for User Story 4

- [x] T045 [US4] В `apps/web/src/widgets/shell/ui/Shell.tsx` задать пороги CSS, без `matchMedia` для показа столбцов. От 1280px — сетка US3. 768–1279px: колонки на всю ширину окна `220px minmax(0, 1fr)`, `column-gap: 16px`, правый столбец `display: none` (и пустой тоже), под центр не переносится. Ниже 768px: одна колонка, правого столбца нет. Ровно 1280px — три столбца, 1279px — правого уже нет. Светлый и тёмный вид порог не сдвигают

- [x] T046 [P] [US4] В `apps/web/src/widgets/shell/ui/SiteHeader.tsx` показывать кнопку меню только ниже 768px (`min-[768px]:hidden` вместо `min-[1200px]:hidden`). Та же кнопка на каждом разделе открывает левую навигацию. Кнопка поиска остаётся перед уведомлениями и на планшете, и на телефоне

- [x] T047 [P] [US4] В `apps/web/src/widgets/shell/ui/LeftNavDrawer.tsx` открывать левый список только ниже 768px. От 768px столбец виден на месте, панель не используется

- [x] T048 [US4] Убрать собственный порог 1200px из `apps/web/src/pages/messages/ui/MessagesPage.tsx` и `apps/web/src/widgets/shell/ui/CenterSkeleton.tsx`: сообщения и скелет центра подчиняются оболочке (на ширине от 768px левый столбец оболочки уже есть, правого нет ниже 1280px). Заменить константу `1200` на правила 1280 / 768 в `apps/web/tests/e2e/feed.spec.ts`, `feed-modes.spec.ts`, `article.spec.ts`, `profile.spec.ts`, `messages.spec.ts`, `actions.spec.ts`, `admin-setup.spec.ts`, `search-notifications.spec.ts`, `responsive-a11y.spec.ts` и в `apps/web/src/widgets/shell/ui/BackToTop.tsx`, чтобы три колонки проверялись от 1280px, а панель навигации — ниже 768px

**Checkpoint**: Главная, статья, профиль, сообщения и настройки на 1440, 1280, 1279, 1024 и 390 следуют одним правилам. US3 на широком экране не ломается

---

## Phase 7: User Story 5 — Выбрать эмодзи или изображение реакции (Priority: P2)

**Goal**: Суперадминистратор для каждой из четырёх реакций выбирает один эмодзи или одно изображение. После сохранения новый вид стоит в ленте, статье, комментарии, популярных комментариях и в выборе реакции. Счётчики и уже поставленные реакции не меняются. Обычный администратор вид не меняет.

**Independent Test**: Войти суперадминистратором, у одной реакции сохранить один эмодзи, у другой — изображение, открыть ленту, статью и комментарий: картинки новые, числа прежние. Пустой эмодзи и файл не-изображение не сохраняются. Администратор без роли суперадминистратора получает отказ, как на логотипе.

### Tests for User Story 5 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T049 [P] [US5] Unit-тест в `services/content-service/test/unit/reaction-appearance.test.ts`, падающий до правила: пустой эмодзи, две графемы и обычное слово не сохраняются; одна графема-эмодзи сохраняется; склейка ZWJ, которую `Intl.Segmenter` считает одной графемой, допустима. Пока суперадминистратор не сохранял, значения `😄`, `❤️`, `👍`, `🔥` для `laugh`, `heart`, `thumb`, `fire`

- [x] T050 [P] [US5] Дополнить `services/content-service/test/integration/settings.spec.ts` падающими проверками: `PUT /v1/settings` с `reaction_appearances` из четырёх записей доступен только `superadmin`, роль `admin` — 403, в базе ничего не меняется; `presentation = image` с чужим origin отвергается тем же отказом, что чужой `logo_url`, прежние четыре вида остаются; успех публикует `content.settings.updated` v1, поле в событии необязательное, следующий `GET /v1/settings` содержит поле всегда, в том числе для гостя. В `services/discussion-service` интеграционная проверка: смена вида не меняет строк `reactions`, счётчиков и `my_reaction`

- [x] T051 [P] [US5] Добавить состояния в `apps/web/src/features/react/ui/ReactionRow.stories.tsx`: эмодзи, изображение, несработавшая картинка (видно текстовое имя, кнопка ставит и снимает реакцию). История настроек показывает четыре реакции и недоступность полей не-суперадминистратору — как у логотипа

### Implementation for User Story 5

- [x] T052 [US5] Хранить четыре вида в строке настроек `content`, без новой таблицы. Миграция `services/content-service/src/infra/db/migrations/` и `services/content-service/src/infra/db/schema.ts`: `reaction_appearances` на `settings`. Пока суперадминистратор не сохранял — эмодзи `😄` `❤️` `👍` `🔥`, `image_url` пустой. Набор `kind` закрыт: `laugh`, `heart`, `thumb`, `fire`. Пятого вида нет

- [x] T053 [US5] В `services/content-service/src/modules/settings/settings.schema.ts`, `settings.service.ts` и `settings.repository.ts` принимать `reaction_appearances` целиком на существующем `PUT /v1/settings`. Роль не `superadmin` — 403, база не меняется. `presentation = emoji`: пустая строка или не одна графема-эмодзи (`Intl.Segmenter`) — отказ у этого вида, все четыре прежних вида остаются. `presentation = image`: пустой адрес или адрес не из хранилища площадки — тот же `assertMediaUrl`, что у `logo_url` в `services/content-service/src/modules/media-url.ts`. Файл в настройке не хранится, только адрес после `POST /v1/media?kind=image` (JPEG, PNG, WebP, GIF, до 8 МБ). `GET /v1/settings` отдаёт вид всем, включая гостя. Текстовые ключи переводов (`reaction.laugh` и соседние) эта форма не меняет. Событие в `settings.events.ts` остаётся `content.settings.updated` v1 с необязательным `reaction_appearances`

- [x] T054 [US5] В `services/gateway-service/src/modules/events/events.types.ts` и `events.service.ts` на `content.settings.updated` слать кадр потока `type: 'settings'` каждому соединению, без фильтра по статье. В `apps/web` обработчик кадра инвалидирует ключ публичных настроек (`apps/web/src/entities/settings/model/settings-keys.ts`, подписчик потока рядом с существующими кадрами) и заново читает `GET /v1/settings`. Статьи заново не публиковать. Пока сохранение не успешно, читатели видят прежний вид

- [x] T055 [US5] В `apps/web/src/entities/settings/api/get-settings.ts` принять `reaction_appearances`. В `apps/web/src/entities/reaction/` рисовать глиф из настроек, а не из зашитого `REACTION_EMOJI` в `reaction-kinds.ts` (константу оставить только запасным значением до первой загрузки настроек, совпадающим с `😄` `❤️` `👍` `🔥`). Текстовое имя для читалки — прежние ключи переводов и для эмодзи, и для изображения. Если `image_url` не загрузился, на месте картинки видно это имя

- [x] T056 [US5] В `apps/web/src/features/update-settings/ui/SettingsForm.tsx`, `model/useUpdateSettings.ts` и `api/update-settings.ts` для каждой из четырёх реакций дать выбор `emoji` или `image`. Изображение грузится тем же слотом, что логотип (`POST /v1/media?kind=image`). Пустой эмодзи и непринятый файл не сохраняются: форма показывает, что исправить, прежняя картинка на статье остаётся. Участник с ролью администратора, но не суперадминистратора, поля вида не сохраняет (403 или недоступные поля — как логотип сейчас)

- [x] T057 [US5] В `apps/web/src/features/react/ui/ReactionRow.tsx` и `ReactionControl.tsx` показать сохранённый вид в ленте, на статье, у комментария и в меню выбора. Числа и `my_reaction` по-прежнему приходят из `discussion` и этой настройкой не переписываются. В `apps/web/src/entities/comment/ui/PopularCommentItem.tsx` показать глифы настроенных видов рядом с существующим числом реакций, не добавляя поле картинки в ответ `GET /v1/comments/popular`. Одна реакция человека на объект не становится пятым видом

**Checkpoint**: Смена картинки видна во второй уже открытой вкладке без повторной публикации статьи. Счётчик до и после сохранения совпадает

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Сквозные проверки quickstart и бюджет начального бандла

- [x] T058 [P] Прогнать сценарии `specs/002-firebase-auth-layout/quickstart.md` против `local`: `pnpm test:infra`, `pnpm -r test`, `pnpm -r test:contract`, `pnpm --filter web test:e2e`. Ручной вход Google и GitHub на боевом проекте в этот прогон не входит

- [x] T059 [P] Проверить бюджет начального JS: динамический `import()` в `apps/web/src/features/login/lib/firebase-auth.ts` не входит в начальный чанк, gzip начального JS остаётся ≤ 200 KB. Зафиксировать вывод сборки Vite (`apps/web`, `rollup-plugin-visualizer` уже подключён в `vite.config.ts`)

- [x] T060 Убедиться, что перед коммитом из `.specify/memory/constitution.md` удалён Sync Impact Report, версия остаётся 2.0.0, а `Complexity Tracking` в `specs/002-firebase-auth-layout/plan.md` по-прежнему объясняет три отклонения до тех пор, пока ревью не примет поправку. Контракты `specs/001-community-blog-platform/contracts/` не изменять

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: без зависимостей
- **Foundational (Phase 2)**: после Setup. Блокирует все истории
- **User Stories (Phase 3+)**: после Foundational
- **Polish (Phase 8)**: после тех историй, которые входят в поставку

### User Story Dependencies

- **US1 (P1)**: после Foundational. Других историй не требует. MVP
- **US2 (P1)**: после Foundational и US1. `decideSignIn` уже в фазе 2; US2 добавляет указание почты, остальные кнопки провайдеров и проверки слияния поверх сессии US1
- **US3 (P1)**: после Foundational. От US1 и US2 не зависит, файлы оболочки другие
- **US4 (P2)**: после US3. Те же `Shell.tsx` и `SiteHeader.tsx`: пороги ниже 1280px не делать параллельно с широкой геометрией
- **US5 (P2)**: после Foundational (схемы T007). От входа и каркаса не зависит, кроме уже существующей роли суперадминистратора

### Within Each User Story

- Тесты истории пишутся первыми и падают до реализации
- Схема и репозиторий — до сервиса, сервис — до маршрута, маршрут — до панели
- История заканчивается своим checkpoint до следующей, если работает один человек

### Parallel Opportunities

- T002, T003, T004 — параллельно друг с другом
- T006, T007, T008, T011, T014, T015 — параллельно (разные файлы), после T005 для тех, кто читает служебный контекст
- После фазы 2: US1, US3 и US5 можно вести тремя людьми
- US2 стартует, когда готова панель и `POST /v1/auth/sessions` из US1
- US4 стартует, когда ширина 1280 из US3 уже в `Shell.tsx`
- В US1 параллельны T023, T024, T025 (три сервиса) и тесты T016, T017

---

## Parallel Example: User Story 1

```bash
# Тесты US1 вместе, до кода:
Task: "T016 integration auth.spec.ts"
Task: "T017 e2e auth.spec.ts"

# Предикат почты по сервисам вместе, после T008 и T020:
Task: "T023 content article, follow, profile"
Task: "T024 discussion comment, reaction, bookmark"
Task: "T025 messaging message"
```

## Parallel Example: после фазы 2

```bash
Task: "US1 — почта, Google, GitHub и cookie-сессия"
Task: "US3 — полоса 1280 и прокрутка документа"
Task: "US5 — вид четырёх реакций в content"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Закончить Phase 1 и Phase 2
2. Закончить Phase 3 (US1)
3. Остановиться и проверить US1 на эмуляторе: регистрация, `pending` на занятый адрес, вход, письмо, перезагрузка без секрета Firebase
4. Демонстрировать вход, не дожидаясь каркаса и картинок реакций

### Incremental Delivery

1. Setup + Foundational
2. US1 → вход почтой и двумя провайдерами (MVP)
3. US3 → широкая полоса 1280, затем US4 → планшет и телефон
4. US2 → склейка почты и ограниченная учётка без подтверждённого адреса
5. US5 → эмодзи или изображение, счётчики на месте
6. Polish → quickstart и бюджет бандла

Порядок US3 раньше US2 уместен, если демонстрация — это чтение ленты. Для закрытия входа целиком US2 идёт сразу за US1.

### Parallel Team Strategy

1. Вместе заканчивают фазы 1–2
2. Дальше: один человек — US1, затем US2; второй — US3, затем US4; третий — US5
3. US4 не брать, пока US3 не сдал `Shell.tsx`

---

## Notes

- [P] — разные файлы и нет зависимости от незавершённой задачи
- Метка истории только у фаз US1–US5
- Контракты фичи 001 остаются историческими
- Пароль, `id_token` и `oob_code` в журнал не попадают
- Секрет Firebase после обмена на cookie не сохраняется
- Коммит — после задачи или связной группы, не после каждой правки по пути

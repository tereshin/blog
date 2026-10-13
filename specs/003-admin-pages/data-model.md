# Data Model: Простые страницы

**Owner**: `content-service`, база `content`.

## Page — таблица `pages`

| Поле | Тип | Правило |
| --- | --- | --- |
| id | UUID PK | Создаётся сервером при первом сохранении |
| title | varchar(150) | 1–150 символов после trim |
| slug | varchar(40), UNIQUE | 3–40 символов, `^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$` |
| blocks | JSONB | Полный BlocksDocument, default `{ "blocks": [] }` |
| status | page_status | draft/published/deleted, default draft |
| version | integer | Начинается с 1, растёт при принятой записи |
| created_by | UUID | Создатель из доверенного контекста |
| updated_by | UUID | Последний записавший суперадминистратор |
| created_at | timestamptz | Серверное время первой записи |
| updated_at | timestamptz | Серверное время последней записи |
| published_at | timestamptz nullable | Первая публикация, не сбрасывается |
| deleted_at | timestamptz nullable | Время soft delete |

created_by/updated_by не имеют FK в чужую базу identity. Author, topic,
reactions, comments и visibility отсутствуют. Все published доступны гостю.
Отдельные SEO-поля не добавляются: данные вычисляются из title/blocks.

Индексы: уникальный slug на все состояния, `(created_at DESC, id DESC)`
и `(status, created_at DESC, id DESC)`. Список выбирает метаданные без blocks.
Public lookup: slug + status=published.

## Инварианты

1. Публикация требует содержательного блока после очистки. Сохранение
   страницы, остающейся published, имеет ту же проверку.
2. Slug меняется только при published_at IS NULL; наличие значения
   фиксирует адрес и после снятия с публикации.
3. Удалённая страница сохраняет адрес. Восстановления deleted в MVP нет.
4. Deleted отсутствует в активном admin list/detail, public API, SEO и sitemap.
   deleted_at задан только у deleted.
5. Запись требует expected_version, кроме создания. Successful replay
   не увеличивает version.
6. Отказ оставляет прежние блоки, статус, адрес и версию, не создаёт события успеха.

## Переходы

| Исходное состояние | Операция | Результат |
| --- | --- | --- |
| Нет записи | POST | draft, version=1 |
| draft | PATCH без смены статуса | draft, version+1 |
| draft | PATCH status=published | published, первая публикация задаёт published_at |
| published | PATCH без смены статуса | published, новое содержание сразу публично |
| published | PATCH status=draft | draft, published_at сохраняется |
| draft после снятия | PATCH status=published | published по прежнему адресу |
| draft/published | DELETE | deleted, version+1, deleted_at задан |
| deleted | Новая операция изменения | 404 |

Установка того же статуса разрешена; новый принятый PATCH увеличивает version.
POST не позволяет published/deleted; PATCH не позволяет deleted.

## PageMutation — таблица `page_mutations`

| Поле | Тип | Правило |
| --- | --- | --- |
| actor_id, idempotency_key | UUID + text, составной PK | Один ключ для page-мутаций пользователя |
| request_fingerprint | text | Hash method, нормализованного path, канонического входного DTO |
| response_status | smallint | 201/200/204 подтверждённого результата |
| response_body | JSONB nullable | Исходный DTO ответа; null для DELETE |
| created_at | timestamptz | Время подтверждённой операции |

Ключ — непустая строка ≤ 128 символов. Канонизация фиксируется тестами;
отсутствующее поле не смешивается с полем со значением. Retry хранит входной
снимок в памяти клиента неизменным. POST hash не включает новый ID сервера.
Результаты MVP автоматически не удаляются.

Права проверяются перед поиском результата. В транзакции резервируется ключ
уникальной вставкой, выполняется изменение, записывается outbox и ответ.
Параллельный повтор ждёт исходный commit и получает его результат;
при rollback может выполнить операцию. Другой fingerprint — 409.
Ошибки не сохраняются как успех. Повтор успеха проверяется до expected_version
и до удалённости ресурса: повтор DELETE возвращает прежний 204.

## BlocksDocument и медиа

Использовать `packages/contracts/src/http/blocks.ts`, не HTML-формат.
Обёртка страницы ограничивает 500 блоками и глубиной списков 10.
Перед рекурсивной Zod-проверкой списки обходятся ограниченным нерекурсивным
валидатором. time/version документа — метаданные Editor.js, не pages.version
и не серверные даты.

Trusted-набор файлов строится из image/attaches текущей серверной записи.
Новый URL должен соответствовать origin/пути хранилища и действующему файлу
редактора; старый URL страницы может принадлежать другому редактору.
Удаление блока не удаляет бинарный файл. Сохранённые ранее, но уже удалённые
из текущего документа URL не остаются в trusted-наборе.

## Транзакция обновления

Права → DTO/лимиты → ключ повтора → блокировка страницы → version/slug/state
→ очистка/media → условная запись → outbox → исходный ответ → commit.
UPDATE включает id, version, status != deleted; адрес дополнительно
защищён уникальным индексом, ошибка БД превращается в page_slug_taken.

Media lookup ограничен таймаутом, повторные URL дедуплицируются в запросе.
Его ошибка откатывает транзакцию. Для большого документа lookup новых файлов
можно подготовить до блокировки, но trusted-набор старых URL и CAS обязательно
перепроверяются по заблокированной версии. Прямого publish в брокер до commit нет.

## События

- `content.page.updated` v1: создание/сохранение/публикация/снятие.
- `content.page.deleted` v1: удаление.

Payload: page_id, slug, status, page_version, actor_id, updated_at плюс
стандартный envelope. Документ и название черновика не включаются.
Обязательных новых потребителей в MVP нет.

## Миграция

Добавить page_status, pages, page_mutations и индексы. Не менять
slug_owner_type, статьи и settings.about. Сначала аддитивная миграция,
затем backend. Откат приложения не удаляет данные.

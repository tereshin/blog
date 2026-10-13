# HTTP & Events Contract: Простые страницы

Будущие схемы: `packages/contracts/src/http/pages.ts`, публичные экспорты.

## Доступ

Браузер обращается к gateway; cookie/CSRF использует существующий клиент.
Admin-запросы требуют role=superadmin, user_id, отсутствие ограничения
и подтверждённую почту. can_publish личных статей не проверяется.
Без сессии — 401, другая роль — 403; replay тоже проверяет актуальные права.
Public GET возвращает только published.

Gateway добавляет prefixes `/v1/pages` и `/v1/admin/pages` с service=content,
body limit 1 MiB и существующим timeout. Content проверяет подписанный
ServiceContext, а не роль из payload. DTO проходят Zod и описываются в OpenAPI.

## DTO

| Схема | Поля |
| --- | --- |
| pageStatusSchema | draft или published для admin UI |
| publicPageSchema | id, slug, title, blocks: BlocksDocument, version, published_at, updated_at |
| adminPageSchema | public-поля + status, created_at, created_by, updated_by; published_at nullable |
| adminPageSummarySchema | adminPage без blocks |
| adminPagesSchema | `{ items: AdminPageSummary[], next_cursor: string|null }` |
| createPageSchema | `{ title, slug, blocks }`, blocks default `{ blocks: [] }` |
| updatePageSchema | `{ expected_version, title?, slug?, blocks?, status? }`, хотя бы одно изменение |
| deletePageSchema | `{ expected_version }` |
| adminPagesQuerySchema | status?, cursor?, limit? |

Public published_at — непустая ISO-дата. UUID и ISO 8601 UTC; version —
положительное целое. Создатель/даты/version/deleted_at серверные.
Внешние DTO strictObject, типы выводятся из схем. BlocksDocument совместим
с текущим нормализатором: лишние поля инструментов удаляются общей схемой.

Title 1–150 после trim, slug по [модели](../data-model.md). Документ ≤ 500
блоков, глубина списков ≤ 10, JSON body ≤ 1 MiB. Неподдерживаемый блок
отклоняет весь документ. HTML очищается сервером и перед DOM preview.

## Endpoints

| Method | Path | Ответ | Поведение |
| --- | --- | --- | --- |
| GET | `/v1/pages/{slug}` | 200 PublicPage | Только published, остальные состояния 404 |
| GET | `/v1/admin/pages` | 200 AdminPages | Все активные либо фильтр статуса |
| POST | `/v1/admin/pages` | 201 AdminPage | Всегда draft |
| GET | `/v1/admin/pages/{id}` | 200 AdminPage | draft/published, deleted=404 |
| PATCH | `/v1/admin/pages/{id}` | 200 AdminPage | CAS + атомарные поля/документ/status |
| DELETE | `/v1/admin/pages/{id}` | 204 | CAS + soft delete |

POST/PATCH/DELETE требуют X-Idempotency-Key (1–128 символов). DELETE принимает
JSON expected_version. Отдельного /publish endpoint нет. UI публикует PATCH
с текущими title/slug/blocks и status=published; API разрешает публикацию
уже сохранённых полей без повторной передачи документа.

Пагинация: limit=20 по умолчанию, 1–100; порядок created_at DESC, id DESC.
Cursor кодирует created_at/id и фильтр status. Cursor другого фильтра — 400.
При смене фильтра UI начинает с первой порции. Summary/cursor без содержания.

Cache-Control admin и public GET — no-store. Query-кэш только в памяти;
public refetch при mount/focus. Public 404 не различает draft/deleted/missing.

## Пример

POST:

```json
{
  "title": "Контакты",
  "slug": "contacts",
  "blocks": {
    "blocks": [{ "type": "paragraph", "data": { "text": "Свяжитесь с нами" } }]
  }
}
```

PATCH публикации сохранённого документа:

```json
{ "expected_version": 1, "status": "published" }
```

Новый принятый PATCH увеличивает version даже при прежнем status;
replay возвращает исходный ответ без нового увеличения.

## Ошибки

application/problem+json, request_id — существующий AppError handler.

| HTTP | code | Когда |
| --- | --- | --- |
| 400 | validation_error | DTO, slug, лимиты, отсутствующий ключ |
| 401 | unauthorized | Требуется вход |
| 403 | forbidden | Другая роль |
| 403 | restricted / email_unverified | Ограничение / неподтверждённая почта |
| 403 | foreign_file | Новый чужой файл, отсутствующий в текущей странице |
| 404 | page_not_found | Неизвестная/удалённая admin запись, закрытая public страница |
| 409 | page_slug_taken | Адрес занят, включая deleted |
| 409 | page_version_conflict | Иная version; details.current_version без blocks |
| 409 | page_slug_locked | Изменение адреса после первой публикации |
| 409 | idempotency_key_conflict | Тот же ключ, другой fingerprint |
| 422 | page_not_publishable | Итоговый published без содержательных блоков |
| 413 | payload_too_large | Тело больше 1 MiB |
| 503 | service_unavailable | Media недоступен, запись не выполнена |

Unsupported block — validation_error с причиной unsupported_block для UI.
Причины title/slug/blocks показываются у поля. Причина публикации content.
Права проверяются до поиска ресурса.

## Повторы и конкурентность

Одна операция имеет стабильные key/payload. Replay проверяется до устаревшего
expected_version. Новые правки — новый ключ и актуальная версия.
После потери ответа UI повторяет исходный запрос. Повтор POST после рестарта
возвращает тот же ID; повтор DELETE — тот же 204. Из двух разных операций
с одной expected_version проходит одна.

## SEO и sitemap

`GET /v1/seo?path=/pages/{slug}` и `/internal/seo/page?path=...`:

- Published: status=200, canonical /pages/{slug}, title по шаблону площадки,
  description из чистого текста, og_type=website, WebPage.
- Draft/deleted/missing: status=404, noindex, нейтральный title и пустой
  body_text, без названия, изображений и дат закрытой страницы.
- Admin routes: noindex, body_text пустой.
- Index только при APP_ENV=prod и settings.seo.indexing_enabled.

Sitemap: группа pages, `/sitemaps/pages-start.xml` и pages-{uuid}.xml,
только published, keyset по UUID, существующая порция 10 000.
Gateway использует существующий prerender и возвращает HTTP 404 ботам
для draft/deleted/missing.

## Events v1

| Событие | Payload |
| --- | --- |
| content.page.updated | page_id, slug, status: draft/published, page_version, actor_id, updated_at |
| content.page.deleted | page_id, slug, status: deleted, page_version, actor_id, updated_at |

Envelope — существующая схема: event_id, occurred_at, correlation_id,
causation_id, version формата. Payload.page_version — версия страницы.
Outbox содержит одно событие принятой операции; replay не создаёт второе.
Потребители событий статей не получают события страниц.

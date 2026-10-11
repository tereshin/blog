# Блог

Площадка публикаций и обсуждений. Браузер говорит только с gateway. Сервисы не видят cookie сессии.

## Запуск

Нужны Node.js 22, pnpm и Docker Compose v2.

```bash
pnpm install
cp infra/env/local.env.example infra/env/local.env
pnpm local
```

`pnpm local` поднимает окружение `local` и загружает малый набор данных. Клиент — http://localhost:8080, gateway — http://localhost:3000, тестовый вход — http://mock-google.localhost:8081.

```bash
pnpm infra:up local
pnpm infra:down local
pnpm infra:seed local small
pnpm infra:bootstrap-prod
pnpm --filter web dev
pnpm --filter <service> dev
pnpm test:infra
```

`pnpm --filter web dev` открывает http://localhost:5173. `VITE_API_MOCK=1` включает фикстурный gateway. Сервис с хоста берёт переменные из `infra/env/local.host.env`.

## Prod

Внешний вход в репозитории не описан. Он должен отдавать клиент и gateway с одного origin по HTTPS. `/v1/*`, включая `GET /v1/events`, идёт в gateway без буферизации и с таймаутом простоя не меньше 60 секунд. Запросы роботов и превью ко всем маршрутам страниц (включая `/`, `/popular`, `/rating`, `/about` и неизвестные адреса) идут в gateway. `/robots.txt`, `/sitemap.xml` и `/sitemaps/*.xml` всегда идут в gateway независимо от User-Agent. Статика `/assets/*` и страницы обычных браузеров идут в контейнер клиента. Список User-Agent должен соответствовать `services/gateway-service/src/modules/prerender/bot-detector.ts`, включая VK; ответы страниц имеют `Vary: User-Agent`, их нельзя смешивать в CDN-кэше. Резервные копии томов PostgreSQL и MinIO делаются вне репозитория.

В `prod` нет `mock-google`. `pnpm infra:up prod` не стартует без `infra/env/prod.env` и отказывается от заглушек `CHANGE_ME`.

Подробности окружений — в `specs/001-community-blog-platform/contracts/environments.md`, сценарии проверки — в `specs/001-community-blog-platform/quickstart.md`.

## SEO и социальные превью

В `/admin/settings` суперадминистратор задаёт SEO сайта и страниц, издателя и оформление обложек; `PUBLIC_ORIGIN` отображается только для чтения. В параметрах статьи автор может переопределить SEO-заголовок и описание. Пустые поля используют текст статьи. `GET /v1/seo?path=/p/slug` отдаёт тот же `PageSeo`, что использует HTML роботов. Локальное и dev-окружения всегда закрыты от индексации.

Публикация сразу возвращает результат. Транзакционный outbox отправляет `content.social_cover.requested`; media сохраняет задачу, рендерит её в worker threads и записывает JPEG в MinIO, затем отправляет `media.social_cover.generated` через собственный outbox. Пока комплект не готов, используются общая обложка или карточка сайта. `social_cover_jobs` хранит попытки, аренду задачи и окончательную ошибку; после пяти ошибок задача имеет статус `failed`. Метрики `consumer_duration{subject="social-cover-render"}`, `consumer_lag{durable="media-social-cover-jobs"}` и `dlq_depth{stream="media-social-cover-jobs"}` показывают время, очередь и окончательные сбои.

Миграции запускаются штатными `<service>-migrate` перед content/media. Сборка media включает Satori, Sharp, отдельный worker и шрифты Noto Sans с лицензией OFL. Старые статьи массово не пересоздаются: генерация запрашивается при публикации, правке или восстановлении публичного доступа. Изменение имени автора обновляет только ранее запрошенные карточки. Файлы имеют версию входных данных и неизменяемый URL. Закрытие статьи исключает её изображения из SEO, запоздавшие результаты не принимаются.

После выкладки проверить публичную статью и профиль в Google Rich Results Test, отправить `/sitemap.xml` в Search Console и проверить внешний вход запросами с `Googlebot`, `TelegramBot` и `vkShare`. JSON-LD в HTML использует nonce действующей CSP; `unsafe-inline` не требуется.

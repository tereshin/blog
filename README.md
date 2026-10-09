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

Внешний вход в репозитории не описан. Он должен отдавать клиент и gateway с одного origin по HTTPS. `/v1/*`, включая `GET /v1/events`, идёт в gateway без буферизации и с таймаутом простоя не меньше 60 секунд. Запросы роботов и превью к `/p/{slug}`, `/u/{slug}` и `/t/{slug}` идут в gateway, остальное — в контейнер клиента. Резервные копии томов PostgreSQL и MinIO делаются вне репозитория.

В `prod` нет `mock-google`. `pnpm infra:up prod` не стартует без `infra/env/prod.env` и отказывается от заглушек `CHANGE_ME`.

Подробности окружений — в `specs/001-community-blog-platform/contracts/environments.md`, сценарии проверки — в `specs/001-community-blog-platform/quickstart.md`.

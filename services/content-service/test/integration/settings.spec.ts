import { DEFAULT_PROFILE_BADGES } from '../../src/shared/profile-badges.ts'
import { faviconSettingsSchema } from '@blog/contracts'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  DEFAULT_REACTION_APPEARANCES,
  DEFAULT_SEO_SETTINGS,
  DEFAULT_SHELL_VISIBILITY,
  DEFAULT_SOCIAL_COVER_SETTINGS,
  SettingsUpdatedV1,
} from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { outbox, settings } from '../../src/infra/db/schema.ts'
import { composeContent } from '../../src/app.modules.ts'
import { settingsRoutes } from '../../src/modules/settings/index.ts'

const MEDIA = 'http://media.test'
const SUPER = '11111111-1111-4111-8111-111111111111'

const viewers: Record<string, ServiceContext> = {
  guest: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:1' },
  admin: {
    user_id: SUPER,
    role: 'admin',
    is_restricted: false,
    can_publish: true,
    viewer_key: `user:${SUPER}`,
  },
  superadmin: {
    user_id: SUPER,
    role: 'superadmin',
    is_restricted: false,
    can_publish: true,
    viewer_key: `user:${SUPER}`,
  },
}

const body = {
  name: 'Площадка',
  logo_url: `${MEDIA}/logo.png`,
  locale: 'en',
  registration_open: false,
  new_members_can_publish: false,
  reaction_appearances: DEFAULT_REACTION_APPEARANCES,
  profile_status_icons: [],
}

describe('content: настройки площадки', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    app = Fastify()
    await app.register(requestContext, {
      logger: createLogger({ service: 'content-test', level: 'silent' }),
    })
    await app.register(errorHandler)
    app.decorateRequest('viewer', undefined as unknown as ServiceContext)
    app.addHook('onRequest', async (request) => {
      request.viewer =
        viewers[String(request.headers['x-test-viewer'])] ?? (viewers['guest'] as ServiceContext)
    })
    const modules = composeContent({ database, media_url: MEDIA })
    await app.register(settingsRoutes, { controller: modules.settings })
  }, 120_000)

  afterAll(async () => {
    await app.close()
    await database.close()
    await postgres.stop()
  })

  it('пока строка не задана, публичные настройки — значения по умолчанию', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/settings' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      maintenance_enabled: false,
      welcome_content: null,
      name: 'Блог',
      logo_url: null,
      logo_dark_url: null,
      favicon: faviconSettingsSchema.parse({}),
      locale: 'ru',
      reaction_appearances: DEFAULT_REACTION_APPEARANCES,
      profile_status_icons: [],
      profile_badges: DEFAULT_PROFILE_BADGES,
      seo: DEFAULT_SEO_SETTINGS,
      social_cover: DEFAULT_SOCIAL_COVER_SETTINGS,
      shell: DEFAULT_SHELL_VISIBILITY,
    })
  })

  it('администратор не сохраняет настройки и событие не появляется', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'admin', 'content-type': 'application/json' },
      payload: body,
    })
    expect(response.statusCode).toBe(403)
    expect(await database.db.select().from(outbox)).toHaveLength(0)
    expect(await database.db.select().from(settings)).toHaveLength(0)
  })

  it('логотип с чужого адреса не сохраняется', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: { ...body, logo_url: 'https://evil.test/logo.png' },
    })
    expect(response.statusCode).toBe(422)
    expect(response.json()).toMatchObject({ code: 'validation_failed' })
  })

  it('суперадминистратор сохраняет настройки, публичный ответ скрывает флаги, событие уходит', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: body,
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      ...body,
      profile_badges: DEFAULT_PROFILE_BADGES,
      maintenance_enabled: false,
      welcome_content: null,
      logo_dark_url: null,
      favicon: faviconSettingsSchema.parse({}),
      seo: DEFAULT_SEO_SETTINGS,
      social_cover: DEFAULT_SOCIAL_COVER_SETTINGS,
      shell: DEFAULT_SHELL_VISIBILITY,
      public_origin: 'http://localhost',
    })
    expect((await app.inject({ method: 'GET', url: '/v1/settings' })).json()).toEqual({
      maintenance_enabled: false,
      welcome_content: null,
      name: 'Площадка',
      logo_url: `${MEDIA}/logo.png`,
      logo_dark_url: null,
      favicon: faviconSettingsSchema.parse({}),
      locale: 'en',
      reaction_appearances: DEFAULT_REACTION_APPEARANCES,
      profile_status_icons: [],
      profile_badges: DEFAULT_PROFILE_BADGES,
      seo: DEFAULT_SEO_SETTINGS,
      social_cover: DEFAULT_SOCIAL_COVER_SETTINGS,
      shell: DEFAULT_SHELL_VISIBILITY,
    })
    const events = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.name, 'content.settings.updated'))
    expect(events).toHaveLength(1)
    expect(events[0]?.payload).toMatchObject({
      site_name: 'Площадка',
      registration_open: false,
      new_members_can_publish: false,
      locale: 'en',
    })
  })

  it('закрытые флаги видит только суперадминистратор', async () => {
    const denied = await app.inject({
      method: 'GET',
      url: '/v1/settings/admin',
      headers: { 'x-test-viewer': 'admin' },
    })
    expect(denied.statusCode).toBe(403)
    const allowed = await app.inject({
      method: 'GET',
      url: '/v1/settings/admin',
      headers: { 'x-test-viewer': 'superadmin' },
    })
    expect(allowed.statusCode).toBe(200)
    expect(allowed.json()).toMatchObject({
      registration_open: false,
      new_members_can_publish: false,
    })
  })

  it('администратор не меняет вид реакций, строка настроек остаётся прежней', async () => {
    const before_rows = await database.db.select().from(settings)
    const before_events = await database.db.select().from(outbox)
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'admin', 'content-type': 'application/json' },
      payload: {
        ...body,
        name: 'Чужая',
        reaction_appearances: [
          { kind: 'laugh', label: 'Смех', status: 'active', presentation: 'emoji', emoji: '🎉' },
          DEFAULT_REACTION_APPEARANCES[0],
          DEFAULT_REACTION_APPEARANCES[2],
          DEFAULT_REACTION_APPEARANCES[3],
        ],
      },
    })
    expect(response.statusCode).toBe(403)
    expect(await database.db.select().from(settings)).toEqual(before_rows)
    expect(await database.db.select().from(outbox)).toEqual(before_events)
  })

  it('чужой адрес картинки реакции отвергается так же, как чужой логотип, прежние четыре вида остаются', async () => {
    const before_rows = await database.db.select().from(settings)
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: {
        ...body,
        reaction_appearances: [
          {
            kind: 'laugh',
            label: 'Смех',
            status: 'active',
            presentation: 'image',
            image_url: 'https://evil.test/laugh.png',
          },
          DEFAULT_REACTION_APPEARANCES[1],
          DEFAULT_REACTION_APPEARANCES[2],
          DEFAULT_REACTION_APPEARANCES[3],
        ],
      },
    })
    expect(response.statusCode).toBe(422)
    expect(response.json()).toMatchObject({ code: 'validation_failed' })
    expect(await database.db.select().from(settings)).toEqual(before_rows)
  })

  it('пустой эмодзи, две графемы и слово не затирают сохранённые виды', async () => {
    const before_rows = await database.db.select().from(settings)
    for (const emoji of ['', '😄😄', 'hello']) {
      const response = await app.inject({
        method: 'PUT',
        url: '/v1/settings',
        headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
        payload: {
          ...body,
          reaction_appearances: [
            { kind: 'laugh', label: 'Смех', status: 'active', presentation: 'emoji', emoji },
            DEFAULT_REACTION_APPEARANCES[1],
            DEFAULT_REACTION_APPEARANCES[2],
            DEFAULT_REACTION_APPEARANCES[3],
          ],
        },
      })
      expect(response.statusCode).toBe(422)
      expect(response.json()).toMatchObject({ code: 'validation_failed' })
    }
    expect(await database.db.select().from(settings)).toEqual(before_rows)
  })

  it('частичное тело по-прежнему отвергается, строка не меняется', async () => {
    const before_rows = await database.db.select().from(settings)
    const partial = {
      name: body.name,
      logo_url: body.logo_url,
      locale: body.locale,
      registration_open: body.registration_open,
      new_members_can_publish: body.new_members_can_publish,
    }
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: partial,
    })
    expect(response.statusCode).toBe(422)
    expect(await database.db.select().from(settings)).toEqual(before_rows)
  })

  it('успех публикует событие с необязательным полем, гость читает вид', async () => {
    const saved_appearances = [
      {
        kind: 'laugh' as const,
        label: 'Laugh',
        status: 'active' as const,
        presentation: 'emoji' as const,
        emoji: '🎉',
      },
      {
        kind: 'heart' as const,
        label: 'Heart',
        status: 'active' as const,
        presentation: 'emoji' as const,
        emoji: '❤️',
      },
      {
        kind: 'thumb' as const,
        label: 'Thumbs up',
        status: 'active' as const,
        presentation: 'image' as const,
        image_url: `${MEDIA}/thumb.png`,
      },
      {
        kind: 'fire' as const,
        label: 'Fire',
        status: 'retired' as const,
        presentation: 'emoji' as const,
        emoji: '🔥',
      },
    ]
    const before_count = (
      await database.db.select().from(outbox).where(eq(outbox.name, 'content.settings.updated'))
    ).length
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: { ...body, reaction_appearances: saved_appearances },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ reaction_appearances: saved_appearances })

    const events = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.name, 'content.settings.updated'))
    expect(events).toHaveLength(before_count + 1)
    const parsed = events
      .map((event) => SettingsUpdatedV1.parse(event.payload))
      .find((event) => {
        const first = event.reaction_appearances?.[0]
        return first?.presentation === 'emoji' && first.emoji === '🎉'
      })
    expect(parsed?.reaction_appearances).toEqual(saved_appearances)
    const without_appearances = { ...parsed }
    delete without_appearances.reaction_appearances
    expect(SettingsUpdatedV1.parse(without_appearances).site_name).toBe('Площадка')

    const guest = await app.inject({
      method: 'GET',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'guest' },
    })
    expect(guest.statusCode).toBe(200)
    expect(guest.json()).toMatchObject({ reaction_appearances: saved_appearances })
    expect(guest.json()).not.toHaveProperty('registration_open')
  })
  it('иконки статусов сохраняются отдельно от реакций и публикуются для участников', async () => {
    const icon = {
      id: '44444444-4444-4444-8444-444444444444',
      label: 'В отпуске',
      image_url: `${MEDIA}/holiday.png`,
    }
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin' },
      payload: { ...body, profile_status_icons: [icon] },
    })
    expect(response.statusCode).toBe(200)
    const public_response = await app.inject({ method: 'GET', url: '/v1/settings' })
    expect(public_response.json()).toMatchObject({
      profile_status_icons: [icon],
      reaction_appearances: body.reaction_appearances,
    })
    const denied = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin' },
      payload: {
        ...body,
        profile_status_icons: [{ ...icon, image_url: 'https://other.test/icon.png' }],
      },
    })
    expect(denied.statusCode).toBe(422)
    expect(
      (await app.inject({ method: 'GET', url: '/v1/settings' })).json().profile_status_icons,
    ).toEqual([icon])
  })

  it('пустой набор и 21-я активная реакция не сохраняются', async () => {
    const before_rows = await database.db.select().from(settings)
    const retired = DEFAULT_REACTION_APPEARANCES.map((item) => ({
      ...item,
      status: 'retired' as const,
    }))
    const empty = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: { ...body, reaction_appearances: retired },
    })
    expect(empty.statusCode).toBe(422)
    const extra = Array.from({ length: 21 }, (_, index) => ({
      kind: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      label: `Вид ${index + 1}`,
      status: 'active' as const,
      presentation: 'emoji' as const,
      emoji: '⭐',
    }))
    const overflow = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: { ...body, reaction_appearances: extra },
    })
    expect(overflow.statusCode).toBe(422)
    expect(await database.db.select().from(settings)).toEqual(before_rows)
  })

  it('preserves site assets when a legacy settings request omits them, and allows removal', async () => {
    const assets = {
      logo_dark_url: `${MEDIA}/dark.png`,
      favicon: faviconSettingsSchema.parse({
        svg: `${MEDIA}/icon.svg`,
        manifest: `${MEDIA}/site.webmanifest`,
      }),
    }
    const headers = { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' }
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/v1/settings',
          headers,
          payload: { ...body, ...assets },
        })
      ).statusCode,
    ).toBe(200)
    const legacy = await app.inject({ method: 'PUT', url: '/v1/settings', headers, payload: body })
    expect(legacy.statusCode).toBe(200)
    expect(legacy.json()).toMatchObject(assets)
    const clear = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers,
      payload: { ...body, logo_dark_url: null, favicon: faviconSettingsSchema.parse({}) },
    })
    expect(clear.json().logo_dark_url).toBeNull()
    expect(clear.json().favicon.svg).toBeNull()
  })

  it('выключенный раздел и блок комментариев видны гостю', async () => {
    const shell = { ...DEFAULT_SHELL_VISIBILITY, popular: false, popular_comments: false }
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin', 'content-type': 'application/json' },
      payload: { ...body, shell },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().shell).toEqual(shell)
    const guest = await app.inject({ method: 'GET', url: '/v1/settings' })
    expect(guest.json().shell).toEqual(shell)
    expect(guest.json()).not.toHaveProperty('registration_open')
  })
  it('welcome content is sanitized, persisted, preserved by unrelated updates and removable', async () => {
    const welcome_content = {
      title: 'Welcome',
      document: {
        blocks: [{ type: 'paragraph', data: { text: '<b>Hello</b><script>alert(1)</script>' } }],
      },
    }
    const save = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin' },
      payload: { ...body, welcome_content },
    })
    expect(save.statusCode).toBe(200)
    expect(save.json().welcome_content.document.blocks[0].data.text).toBe('<b>Hello</b>')
    const forbidden = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'admin' },
      payload: { ...body, welcome_content: null },
    })
    expect(forbidden.statusCode).toBe(403)
    await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin' },
      payload: body,
    })
    const public_response = await app.inject({ method: 'GET', url: '/v1/settings' })
    expect(public_response.json().welcome_content.title).toBe('Welcome')
    const removed = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers: { 'x-test-viewer': 'superadmin' },
      payload: { ...body, welcome_content: null },
    })
    expect(removed.json().welcome_content).toBeNull()
  })
  it('maintenance is persisted, preserved by legacy updates, and can only be changed by superadmin', async () => {
    const headers = { 'x-test-viewer': 'superadmin' }
    const saved = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers,
      payload: { ...body, maintenance_enabled: true, welcome_content: { title: 'Closed home page', document: { blocks: [{ type: 'paragraph', data: { text: 'Suspended content' } }] } } },
    })
    expect(saved.statusCode).toBe(200)
    expect(saved.json().maintenance_enabled).toBe(true)
    expect(saved.json().welcome_content.title).toBe('Closed home page')
    expect((await app.inject({ url: '/v1/settings' })).json().welcome_content).toBeNull()
    expect((await app.inject({ url: '/v1/settings', headers })).json().welcome_content.title).toBe('Closed home page')
    expect((await app.inject({ url: '/v1/settings' })).json().maintenance_enabled).toBe(true)
    expect((await app.inject({ url: '/internal/settings/maintenance' })).json()).toEqual({
      maintenance_enabled: true,
      locale: 'en',
    })
    expect((await database.db.select().from(settings))[0]?.maintenance_enabled).toBe(true)
    const events = await database.db
      .select()
      .from(outbox)
      .where(eq(outbox.name, 'content.settings.updated'))
    expect(
      events.some((event) => SettingsUpdatedV1.parse(event.payload).maintenance_enabled === true),
    ).toBe(true)
    const legacy = await app.inject({ method: 'PUT', url: '/v1/settings', headers, payload: body })
    expect(legacy.json().maintenance_enabled).toBe(true)
    for (const role of ['guest', 'admin']) {
      const denied = await app.inject({
        method: 'PUT',
        url: '/v1/settings',
        headers: { 'x-test-viewer': role },
        payload: { ...body, maintenance_enabled: false },
      })
      expect(denied.statusCode).toBe(403)
    }
    const restored = await app.inject({
      method: 'PUT',
      url: '/v1/settings',
      headers,
      payload: { ...body, maintenance_enabled: false },
    })
    expect(restored.json().maintenance_enabled).toBe(false)
  })
})

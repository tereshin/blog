import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_SOCIAL_COVER_SETTINGS, socialCoverPreviewResponseSchema } from '@blog/contracts'
import type { ServiceContext } from '@blog/contracts'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { createCoverRenderer, socialCoverRoutes } from '../../src/modules/social-cover/index.ts'
import type { CoverRenderer } from '../../src/modules/social-cover/index.ts'

const payload = { variant: 'vk', input: { title: 'Текущие значения формы: Ђорђе и русский текст', author_name: 'Автор', site_name: 'Сайт', image_url: null, settings: { ...DEFAULT_SOCIAL_COVER_SETTINGS, background_mode: 'color', background_color: '#445566' } } }
describe('серверный предпросмотр: контракт, доступ и настоящий worker', () => {
  let app: FastifyInstance, renderer: CoverRenderer
  beforeAll(async () => {
    renderer = createCoverRenderer(1)
    app = Fastify()
    await app.register(requestContext, { logger: createLogger({ service: 'preview-test', level: 'silent' }) })
    await app.register(errorHandler)
    app.decorateRequest('viewer', { getter() { return { role: this.headers['x-role'] === 'superadmin' ? 'superadmin' : 'guest', is_restricted: this.headers['x-restricted'] === '1', can_publish: false, viewer_key: 'preview-test' } satisfies ServiceContext } })
    await app.register(socialCoverRoutes, { renderer, public_url: 'https://media.example', store: { async put() { throw new Error('Preview must not write files') } } })
  })
  afterAll(async () => { await app.close(); await renderer.close() })
  it.each([{ }, { 'x-role': 'member' }, { 'x-role': 'superadmin', 'x-restricted': '1' }])('отклоняет зрителя %j', async (headers) => {
    expect((await app.inject({ method: 'POST', url: '/v1/media/social-cover-preview', headers, payload })).statusCode).toBe(403)
  })
  it('рендерит JPEG нужного размера из актуальных значений формы без сохранения файлов', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/media/social-cover-preview', headers: { 'x-role': 'superadmin' }, payload })
    expect(response.statusCode).toBe(200)
    const result = socialCoverPreviewResponseSchema.parse(response.json())
    const bytes = Buffer.from(result.image_url.slice('data:image/jpeg;base64,'.length), 'base64')
    expect(await sharp(bytes).metadata()).toMatchObject({ width: 1074, height: 480, format: 'jpeg' })
    const pixel = await sharp(bytes).extract({ left: 10, top: 10, width: 1, height: 1 }).raw().toBuffer()
    expect(Math.abs((pixel[0] ?? 0) - 0x44)).toBeLessThan(3)
    expect(response.headers['cache-control']).toBe('no-store')
  }, 30_000)
})

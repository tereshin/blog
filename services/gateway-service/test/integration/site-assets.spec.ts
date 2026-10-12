import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { faviconSettingsSchema } from '@blog/contracts'
import type { FaviconSettings } from '@blog/contracts'
import type { ServiceClient } from '@blog/http-kit'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { ProxyService } from '../../src/modules/proxy/index.ts'
import { siteAssetRoutes } from '../../src/modules/site-assets/index.ts'
import { renderPrerenderHtml } from '../../src/modules/prerender/html-template.ts'

const MIME = {
  png: 'image/png',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  apple: 'image/png',
  manifest: 'application/manifest+json',
}
describe('public site assets', () => {
  let app: FastifyInstance, media: FastifyInstance, proxy: ProxyService
  let favicon: FaviconSettings = faviconSettingsSchema.parse({
    png: 'http://files.test/png',
    svg: 'http://files.test/svg',
    ico: 'http://files.test/ico',
    apple: 'http://files.test/apple',
    manifest: 'http://files.test/manifest',
  })
  beforeAll(async () => {
    media = Fastify()
    media.get('/internal/files/content', async (request, reply) => {
      const query = request.query as { url: string }
      const variant = query.url.split('/').at(-1)
      if (!variant || !(variant in MIME)) return reply.code(404).send()
      const mime = MIME[variant as keyof typeof MIME]
      return reply
        .type(mime)
        .send(
          Buffer.from(
            variant === 'manifest' ? '{"icons":[{"src":"/favicon-96x96.png"}]}' : variant,
          ),
        )
    })
    const origin = await media.listen({ host: '127.0.0.1', port: 0 })
    proxy = new ProxyService({
      content: origin,
      media: origin,
      identity: origin,
      discussion: origin,
      messaging: origin,
      notification: origin,
    })
    const content: ServiceClient = {
      async request() {
        return { status: 200, headers: {}, body: { favicon } }
      },
      async close() {},
    }
    app = Fastify()
    await app.register(requestContext, {
      logger: createLogger({ service: 'assets-test', level: 'silent' }),
    })
    await app.register(errorHandler)
    app.addHook('onRequest', async (request) => {
      request.viewer_session = { context: { role: 'guest', is_restricted: false, can_publish: false, viewer_key: 'guest:test' }, session_id: null, service_context_jwt: 'test' }
    })
    await app.register(siteAssetRoutes, { content, proxy })
  })
  afterAll(async () => {
    await app.close()
    await proxy.close()
    await media.close()
  })
  it.each([
    ['/favicon-96x96.png', 'image/png'],
    ['/favicon.svg', 'image/svg+xml'],
    ['/favicon.ico', 'image/x-icon'],
    ['/apple-touch-icon.png', 'image/png'],
    ['/site.webmanifest', 'application/manifest+json'],
  ])('%s returns the uploaded file and its real MIME', async (path, mime) => {
    const response = await app.inject({ url: path })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe(mime)
    expect(response.headers['cache-control']).toBe('no-cache')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })
  it('revalidates unchanged assets and changes the ETag after replacement', async () => {
    const first = await app.inject({ url: '/favicon.svg' })
    const etag = String(first.headers['etag'])
    expect(
      (await app.inject({ url: '/favicon.svg', headers: { 'if-none-match': etag } })).statusCode,
    ).toBe(304)
    favicon = { ...favicon, svg: 'http://files.test/replaced/svg' }
    const replacement = await app.inject({
      url: '/favicon.svg',
      headers: { 'if-none-match': etag },
    })
    expect(replacement.statusCode).toBe(200)
    expect(replacement.headers['etag']).not.toBe(etag)
    favicon = { ...favicon, svg: null }
    expect((await app.inject({ url: '/favicon.svg' })).statusCode).toBe(404)
  })
  it('prerender includes only configured asset links', () => {
    const html = renderPrerenderHtml({
      favicon,
      status: 200,
      title: 'Blog',
      description: '',
      canonical_url: 'https://blog.test/',
      robots: 'index, follow',
      site_name: 'Blog',
      locale: 'en',
      og_type: 'website',
      images: null,
      body_text: '',
      structured_data: { '@context': 'https://schema.org', '@graph': [] },
    })
    expect(html).toContain('/favicon-96x96.png?v=png')
    expect(html).toContain('sizes="180x180"')
    expect(html).toContain('rel="manifest"')
    expect(html).not.toContain('/favicon.svg')
  })
})

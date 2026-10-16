import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PageSeo } from '@blog/contracts'
import type { ServiceClient } from '@blog/http-kit'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import {
  PrerenderController,
  PrerenderService,
  prerenderRoutes,
} from '../../src/modules/prerender/index.ts'
import { renderApplicationHtml } from '../../src/modules/prerender/html-template.ts'
import { contentSecurityPolicy } from '../../src/modules/security/content-security-policy.ts'

const image = {
  url: 'https://cdn.example/cover.jpg',
  alt: 'Обложка',
  width: 1200,
  height: 630,
  mime: 'image/jpeg',
}
const NEUTRAL: PageSeo = {
  status: 200,
  title: 'Блог',
  description: '',
  canonical_url: 'https://blog.example/',
  site_name: 'Блог',
  locale: 'ru',
  og_type: 'website',
  robots: 'noindex, follow',
  body_text: '',
  images: null,
  structured_data: { '@context': 'https://schema.org', '@graph': [] },
}
const PUBLIC: PageSeo = {
  ...NEUTRAL,
  title: 'Публичная статья',
  description: 'Короткое описание',
  canonical_url: 'https://blog.example/p/public-post',
  og_type: 'article',
  robots: 'index, follow',
  body_text: 'Текст для робота',
  images: { og: image, twitter: image, vk: { ...image, width: 1074, height: 480 } },
  structured_data: {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: 'Публичная статья',
        description: '</script><script>alert(1)</script> & \u2028',
      },
    ],
  },
}
const TEMPLATE =
  '<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>Площадка</title><script type="module" src="/assets/app-hash.js"></script><link rel="stylesheet" href="/assets/app-hash.css"></head><body><div id="root"></div></body></html>'
function webClient(): ServiceClient {
  return {
    async request({ path }) {
      expect(path).toBe('/index.html')
      return { status: 200, headers: {}, body: TEMPLATE }
    },
    async close() {},
  }
}
function contentClient(): ServiceClient {
  return {
    async request({ path }) {
      if (path.startsWith('/internal/seo/robots'))
        return {
          status: 200,
          headers: {},
          body: { content_type: 'text/plain', body: 'User-agent: *\nDisallow: /\n' },
        }
      if (path.startsWith('/internal/seo/sitemap'))
        return {
          status: 200,
          headers: {},
          body: { content_type: 'application/xml', body: '<urlset></urlset>' },
        }
      const page = new URL(path, 'http://content').searchParams.get('path')
      if (page?.includes('unavailable')) return { status: 500, headers: {}, body: {} }
      if (page?.includes('malformed')) return { status: 200, headers: {}, body: {} }
      return {
        status: 200,
        headers: {},
        body: page?.includes('public-post')
          ? PUBLIC
          : { ...NEUTRAL, status: page?.includes('missing') ? 404 : 200 },
      }
    },
    async close() {},
  }
}
describe('gateway: SEO для роботов', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = Fastify()
    app.decorateReply('csp_nonce', 'test-nonce')
    app.addHook('onRequest', async (_request, reply) => {
      reply.header(
        'Content-Security-Policy',
        contentSecurityPolicy({ nonce: 'test-nonce', image_origin: null }),
      )
    })
    await app.register(requestContext, {
      logger: createLogger({ service: 'gateway-test', level: 'silent' }),
    })
    await app.register(errorHandler)
    await app.register(prerenderRoutes, {
      controller: new PrerenderController(new PrerenderService(contentClient(), webClient())),
    })
  })
  afterAll(async () => {
    await app.close()
  })
  it.each(['TelegramBot', 'vkShare', 'Googlebot', 'Google-InspectionTool'])(
    '%s получает все социальные теги, JSON-LD и текст',
    async (ua) => {
      const response = await app.inject({
        url: '/p/public-post?utm_source=vk',
        headers: { 'user-agent': ua },
      })
      expect(response.statusCode).toBe(200)
      for (const tag of [
        'og:title',
        'og:description',
        'og:image:width',
        'twitter:image',
        'vk:image',
      ])
        expect(response.body).toContain(tag)
      expect(response.body).toContain('Текст для робота')
      expect(response.body).toContain('nonce="test-nonce"')
      expect(response.headers['content-security-policy']).toContain("'nonce-test-nonce'")
      expect(response.headers['content-security-policy']).not.toContain('unsafe-inline')
      expect(response.body).not.toContain('</script><script>')
      const json = /<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/.exec(
        response.body,
      )?.[1]
      expect(JSON.parse(json ?? '{}')).toEqual(PUBLIC.structured_data)
    },
  )
  it('черновик нейтрален и noindex', async () => {
    const response = await app.inject({
      url: '/p/draft-post',
      headers: { 'user-agent': 'TelegramBot' },
    })
    expect(response.body).toContain('<title>Блог</title>')
    expect(response.body).not.toContain('<article>')
    expect(response.headers['x-robots-tag']).toBe('noindex, follow')
  })
  it('404 для отсутствующей страницы, включая корень и общий маршрут', async () => {
    expect(
      (await app.inject({ url: '/missing', headers: { 'user-agent': 'vkShare' } })).statusCode,
    ).toBe(404)
    expect(
      (await app.inject({ url: '/', headers: { 'user-agent': 'Googlebot' } })).statusCode,
    ).toBe(200)
  })
  it.each(['unavailable', 'malformed'])('503 для %s', async (path) =>
    expect(
      (await app.inject({ url: `/p/${path}`, headers: { 'user-agent': 'Googlebot' } })).statusCode,
    ).toBe(503),
  )
  it('исходный HTML одинаков для браузера и робота и сохраняет запуск React', async () => {
    const browser = await app.inject({
      url: '/p/public-post',
      headers: { 'user-agent': 'Mozilla/5.0' },
    })
    const bot = await app.inject({ url: '/p/public-post', headers: { 'user-agent': 'Googlebot' } })
    expect(browser.statusCode).toBe(200)
    expect(browser.body).toBe(bot.body)
    expect(browser.body).toContain('/assets/app-hash.js')
    expect(browser.body).toContain('/assets/app-hash.css')
    expect(browser.body).toContain('<div id="root"><main>')
    expect(browser.body).toContain('data-page-seo')
    expect(browser.body.match(/<title>/g)).toHaveLength(1)
    expect(browser.body).not.toContain('<title>Площадка</title>')
  })
  it('шаблон не интерпретирует пользовательский текст как replace-подстановку', () => {
    const html = renderApplicationHtml(
      { ...PUBLIC, title: "$& $` $'", body_text: '$&' },
      TEMPLATE,
      'nonce',
    )
    expect(html).toContain('<title>$&amp; $` $&#39;</title>')
    expect(html).toContain('<p>$&amp;</p>')
  })
  it.each(['/robots.txt', '/sitemap.xml', '/sitemaps/articles-start.xml'])(
    '%s доступен без User-Agent',
    async (url) => expect((await app.inject({ url })).statusCode).toBe(200),
  )
})

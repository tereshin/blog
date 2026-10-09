import type { FastifyPluginAsync } from 'fastify'
import { NotFoundError } from '@blog/errors'
import type { ServiceClient } from '@blog/http-kit'
import { isBot } from './bot-detector.ts'
import { renderPrerenderHtml } from './html-template.ts'
import { createPrerenderService } from './prerender.service.ts'

const KINDS = { p: 'article', t: 'topic', u: 'profile' } as const

export type PrerenderRoutesOptions = { content: ServiceClient }

/**
 * Внешний вход prod направляет сюда только роботов. Человек получает 404:
 * страницу приложения отдаёт контейнер web.
 */
export const prerenderRoutes: FastifyPluginAsync<PrerenderRoutesOptions> = async (app, options) => {
  const service = createPrerenderService(options.content)

  const replyHtml = async (kind: 'article' | 'topic' | 'profile' | 'site', slug: string, user_agent: string | undefined) => {
    if (!isBot(user_agent)) throw new NotFoundError()
    const page = await service.load(kind, slug)
    return renderPrerenderHtml(page)
  }

  for (const [prefix, kind] of Object.entries(KINDS) as ['p' | 't' | 'u', (typeof KINDS)['p' | 't' | 'u']][]) {
    app.get(`/${prefix}/:slug`, async (request, reply) => {
      const slug = (request.params as { slug: string }).slug
      const html = await replyHtml(kind, slug, request.headers['user-agent'])
      return reply.type('text/html; charset=utf-8').send(html)
    })
  }

  app.get('/*', async (request, reply) => {
    const html = await replyHtml('site', 'home', request.headers['user-agent'])
    return reply.type('text/html; charset=utf-8').send(html)
  })
}

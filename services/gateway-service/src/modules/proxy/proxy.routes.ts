import type { FastifyPluginAsync } from 'fastify'
import type { ProxyController } from './proxy.controller.ts'

export type ProxyRoutesOptions = { controller: ProxyController }

/**
 * `/v1/*` → сервис-владелец. Тело идёт потоком (JSON не разбирается), cookie сервисам не видны:
 * они получают подписанный `X-Service-Context`. Мост сессий: identity просит поставить или снять cookie
 * внутренними заголовками, которые gateway снимает с ответа.
 */
export const proxyRoutes: FastifyPluginAsync<ProxyRoutesOptions> = async (app, { controller }) => {
  app.removeAllContentTypeParsers()
  app.addContentTypeParser('*', (_request, payload, done) => done(null, payload))

  app.all('/v1/*', (request, reply) => controller.forward(request, reply))
}

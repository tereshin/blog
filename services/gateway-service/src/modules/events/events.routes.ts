import { PassThrough } from 'node:stream'
import type { FastifyPluginAsync } from 'fastify'
import { ForbiddenError, NotFoundError } from '@blog/errors'
import type { Connection, EventFrame } from './events.types.ts'
import { subscriptionsSchema } from './events.types.ts'
import type { EventsService } from './events.service.ts'

const HEARTBEAT_MS = 15_000
const MAX_BUFFERED_BYTES = 256 * 1024

export type EventsRoutesOptions = { events: EventsService }

/** `GET /v1/events` (SSE) и `PUT /v1/events/subscriptions`. */
export const eventsRoutes: FastifyPluginAsync<EventsRoutesOptions> = async (app, options) => {
  const { events } = options

  app.get('/v1/events', async (request, reply) => {
    const connection_id = events.newConnectionId()
    // Поток отдаётся через reply.send, а не hijack: onSend-хуки (cookie, CORS, helmet) должны отработать.
    const stream = new PassThrough()

    let heartbeat: NodeJS.Timeout | null = null
    const close = (): void => {
      if (heartbeat) clearInterval(heartbeat)
      heartbeat = null
      events.registry.remove(connection_id)
      if (!stream.writableEnded) stream.end()
    }
    const write = (frame: EventFrame): boolean => {
      if (stream.destroyed || stream.writableEnded) return false
      // Медленный читатель не копит память: поток закрывается, клиент переподключится и перечитает данные.
      if (stream.writableLength + stream.readableLength > MAX_BUFFERED_BYTES) {
        close()
        return false
      }
      stream.write(`data: ${JSON.stringify(frame)}\n\n`)
      return true
    }

    const connection: Connection = {
      id: connection_id,
      viewer: request.viewer_session.context,
      article_ids: new Set(),
      conversation_ids: new Set(),
      feed_key: null,
      notifications: false,
      write,
      close,
    }
    events.registry.add(connection)
    write({ type: 'hello', connection_id })
    heartbeat = setInterval(() => {
      if (!stream.destroyed && !stream.writableEnded) stream.write(': ping\n\n')
    }, HEARTBEAT_MS)
    request.raw.on('close', close)

    return reply
      .type('text/event-stream; charset=utf-8')
      .header('cache-control', 'no-cache, no-transform')
      .header('x-accel-buffering', 'no')
      .send(stream)
  })

  app.put('/v1/events/subscriptions', async (request) => {
    const input = subscriptionsSchema.parse(request.body)
    const connection = events.registry.get(input.connection_id)
    if (!connection) throw new NotFoundError({ message: 'Соединение не найдено: переподключитесь' })
    if (connection.viewer.viewer_key !== request.viewer_session.context.viewer_key) throw new ForbiddenError()
    const accepted = await events.subscribe(connection, request.viewer_session.service_context_jwt, input)
    return { article_ids: accepted.article_ids }
  })
}

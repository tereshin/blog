import { PassThrough } from 'node:stream'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { SubscriptionsInputSchema } from './events.schema.ts'
import type { EventsService } from './events.service.ts'
import type { Connection, EventFrame } from './events.types.ts'

const HEARTBEAT_MS = 15_000
const MAX_BUFFERED_BYTES = 256 * 1024

export class EventsController {
  constructor(private readonly service: EventsService) {}

  async stream(request: FastifyRequest, reply: FastifyReply) {
    const connection_id = this.service.newConnectionId()
    // Поток отдаётся через reply.send, а не hijack: onSend-хуки (cookie, CORS, helmet) должны отработать.
    const stream = new PassThrough()

    let heartbeat: NodeJS.Timeout | null = null
    const close = (): void => {
      if (heartbeat) clearInterval(heartbeat)
      heartbeat = null
      this.service.unregister(connection_id)
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
    this.service.register(connection)
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
  }

  async subscriptions(request: FastifyRequest, reply: FastifyReply) {
    const input = SubscriptionsInputSchema.parse(request.body)
    const { context, service_context_jwt } = request.viewer_session
    const accepted = await this.service.updateSubscriptions(context, service_context_jwt, input)
    return reply.send({ article_ids: accepted.article_ids })
  }
}

import type { FastifyPluginAsync } from 'fastify'
import type { EventsController } from './events.controller.ts'

export type EventsRoutesOptions = { controller: EventsController }

/** `GET /v1/events` (SSE) и `PUT /v1/events/subscriptions`. */
export const eventsRoutes: FastifyPluginAsync<EventsRoutesOptions> = async (app, { controller }) => {
  app.get('/v1/events', (request, reply) => controller.stream(request, reply))
  app.put('/v1/events/subscriptions', (request, reply) => controller.subscriptions(request, reply))
}

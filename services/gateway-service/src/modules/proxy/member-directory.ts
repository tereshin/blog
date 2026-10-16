import { ForbiddenError, UnauthorizedError } from '@blog/errors'
import type { ServiceClient } from '@blog/http-kit'
import type { FastifyPluginAsync } from 'fastify'
import { MemberDirectoryService } from './member-directory.service.ts'

export const memberDirectoryRoutes: FastifyPluginAsync<{
  identity: ServiceClient
  content: ServiceClient
}> = async (app, clients) => {
  const service = new MemberDirectoryService(clients.identity, clients.content)
  app.get('/v1/users', async (request, reply) => {
    const viewer = request.viewer_session
    if (!viewer.context.user_id) throw new UnauthorizedError()
    if (viewer.context.role !== 'superadmin') throw new ForbiddenError()
    return reply.send(
      await service.list(request.query, viewer.service_context_jwt, request.correlation_id),
    )
  })
}

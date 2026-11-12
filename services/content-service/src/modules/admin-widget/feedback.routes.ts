import type { FastifyPluginAsync } from 'fastify'
import { feedbackSubmissionSchema } from '@blog/contracts'
import { z } from 'zod'
import { parsePageInput } from '../page/index.ts'
import type { FeedbackService } from './feedback.service.ts'
export const feedbackRoutes: FastifyPluginAsync<{ service: FeedbackService }> = async (
  app,
  { service },
) => {
  app.post('/v1/widget-feedback', async (request, reply) =>
    reply
      .code(202)
      .send(
        await service.submit(
          parsePageInput(feedbackSubmissionSchema, request.body),
          request.idempotency_key ?? '',
          request.id,
        ),
      ),
  )
  const capability = z.strictObject({ submission_id: z.uuid(), token: z.string().min(32).max(128) })
  app.post('/internal/feedback/read', { config: { is_public: true } }, async (request, reply) => {
    const input = parsePageInput(capability, request.body)
    const payload = await service.delivery(input.submission_id, input.token)
    return payload ? reply.send(payload) : reply.code(404).send()
  })
  app.post(
    '/internal/feedback/complete',
    { config: { is_public: true } },
    async (request, reply) => {
      const input = parsePageInput(capability, request.body)
      await service.remove(input.submission_id, input.token)
      return reply.code(204).send()
    },
  )
  const timer = setInterval(() => {
    void service
      .cleanup()
      .catch(() => app.log.warn({ operation: 'feedbackCleanup' }, 'Feedback cleanup failed'))
  }, 60000)
  timer.unref()
  app.addHook('onClose', async () => clearInterval(timer))
}

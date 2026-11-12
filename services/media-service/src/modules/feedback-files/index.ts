import type { FastifyPluginAsync } from 'fastify'
import type { Readable } from 'node:stream'
import { feedbackCapabilitySchema } from '@blog/contracts'
import { AppError } from '@blog/errors'
import { readBounded } from '../media/index.ts'
import { FeedbackFilesRepository } from './feedback-files.repository.ts'
export { FeedbackFilesRepository } from './feedback-files.repository.ts'
export const feedbackFilesRoutes: FastifyPluginAsync<{ service: FeedbackFilesRepository }> = async (
  app,
  { service },
) => {
  await app.register(async (uploads) => {
    uploads.removeAllContentTypeParsers()
    uploads.addContentTypeParser('*', (_request, payload, done) => done(null, payload))
    uploads.post('/v1/feedback-uploads', async (request, reply) => {
      const token = String(request.headers['x-upload-token'] ?? '')
      let name: string
      try {
        name = decodeURIComponent(String(request.headers['x-file-name'] ?? 'attachment'))
      } catch {
        throw new AppError({
          code: 'validation_error',
          http_status: 400,
          message: 'Invalid file name',
        })
      }
      return reply
        .code(201)
        .send(
          await service.upload(
            token,
            request.idempotency_key ?? '',
            name,
            await readBounded(request.body as Readable, 10 * 1024 * 1024),
          ),
        )
    })
  })
  for (const action of ['claim', 'read', 'complete'] as const) {
    app.post(
      '/internal/feedback-files/' + action,
      { config: { is_public: true } },
      async (request, reply) => {
        const parsed = feedbackCapabilitySchema.safeParse(request.body)
        if (!parsed.success)
          throw new AppError({
            code: 'validation_error',
            http_status: 400,
            message: 'Invalid file capability',
          })
        const { token, submission_id, attachment_ids } = parsed.data
        if (action === 'read') return reply.send(await service.read(token, submission_id))
        if (action === 'claim') await service.claim(token, submission_id, attachment_ids)
        else await service.remove(token, submission_id)
        return reply.code(204).send()
      },
    )
  }
  const timer = setInterval(() => {
    void service
      .cleanup()
      .catch(() =>
        app.log.warn({ operation: 'feedbackFileCleanup' }, 'Temporary file cleanup failed'),
      )
  }, 60000)
  timer.unref()
  app.addHook('onClose', async () => clearInterval(timer))
}

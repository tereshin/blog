import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  commentBookmarkPageSchema,
  commentBookmarkStateSchema,
  commentReactorPageSchema,
  commentReportPageSchema,
  commentReportSchema,
  createCommentReportSchema,
  discussionSubscriptionSchema,
  mentionSearchSchema,
  pageQuerySchema,
  reactionKindSchema,
  reviewCommentReportSchema,
} from '@blog/contracts'
import type { DbHandle } from '../../infra/db/client.ts'
import { createCommentRepository } from './comment.repository.ts'
import { createCommentService } from './comment.service.ts'
import { createCommentReportReviewer } from './comment.report-write.ts'
import { createCommentWriter } from './comment.write.ts'
import { createCommentInteractionRepository } from './comment-interaction.repository.ts'
import { createCommentInteractionService } from './comment-interaction.service.ts'
const params = z.object({ id: z.uuid() })
export const commentInteractionRoutes: FastifyPluginAsync<{ database: DbHandle }> = async (
  app,
  { database },
) => {
  const reader = createCommentRepository(database.db)
  const service = createCommentInteractionService(
    createCommentInteractionRepository(database.db),
    createCommentService(reader, createCommentWriter(database.db)),
    reader,
    createCommentReportReviewer(database.db),
  )
  app.get('/v1/comments/bookmarks', async (request) =>
    commentBookmarkPageSchema.parse(
      await service.bookmarks(request.viewer, pageQuerySchema.parse(request.query)),
    ),
  )
  app.get('/v1/comments/mentions', async (request) =>
    mentionSearchSchema.parse(
      await service.mentions(
        request.viewer,
        z.object({ q: z.string().trim().min(1).max(100) }).parse(request.query).q,
      ),
    ),
  )
  app.put('/v1/comments/:id/bookmark', async (request) =>
    commentBookmarkStateSchema.parse(
      await service.bookmark(request.viewer, params.parse(request.params).id, true),
    ),
  )
  app.delete('/v1/comments/:id/bookmark', async (request) =>
    commentBookmarkStateSchema.parse(
      await service.bookmark(request.viewer, params.parse(request.params).id, false),
    ),
  )
  app.get('/v1/comments/:id/reactors', async (request) => {
    const query = pageQuerySchema.extend({ kind: reactionKindSchema }).parse(request.query)
    return commentReactorPageSchema.parse(
      await service.reactors(request.viewer, params.parse(request.params).id, query.kind, query),
    )
  })
  app.post('/v1/comments/:id/reports', async (request, reply) =>
    reply
      .status(201)
      .send(
        commentReportSchema.parse(
          await service.report(
            request.viewer,
            params.parse(request.params).id,
            createCommentReportSchema.parse(request.body).reason,
          ),
        ),
      ),
  )
  app.get('/v1/moderation/comments/reports', async (request) =>
    commentReportPageSchema.parse(
      await service.reports(request.viewer, pageQuerySchema.parse(request.query)),
    ),
  )
  app.patch('/v1/moderation/comments/reports/:id', async (request) =>
    commentReportSchema.parse(
      await service.review(
        request.viewer,
        params.parse(request.params).id,
        reviewCommentReportSchema.parse(request.body).action,
        request.correlation_id,
      ),
    ),
  )
  app.get('/v1/comments/subscriptions/:id', async (request) =>
    discussionSubscriptionSchema.parse(
      await service.subscription(request.viewer, params.parse(request.params).id),
    ),
  )
  app.put('/v1/comments/subscriptions/:id', async (request) =>
    discussionSubscriptionSchema.parse(
      await service.subscription(request.viewer, params.parse(request.params).id, true),
    ),
  )
  app.delete('/v1/comments/subscriptions/:id', async (request) =>
    discussionSubscriptionSchema.parse(
      await service.subscription(request.viewer, params.parse(request.params).id, false),
    ),
  )
}

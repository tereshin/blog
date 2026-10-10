import { canReadArticle, requireVerifiedEmail } from '@blog/contracts'
import type { PageQuery, ReactionKind, ServiceContext } from '@blog/contracts'
import {
  EmailUnverifiedError,
  ForbiddenError,
  NotFoundError,
  RestrictedError,
  UnauthorizedError,
  ValidationError,
} from '@blog/errors'
import { z } from 'zod'
import type { CommentService, CommentRepository } from './comment.types.ts'
import type { CommentInteractionRepository } from './comment-interaction.types.ts'

const cursorSchema = z.strictObject({ t: z.iso.datetime(), id: z.uuid(), scope: z.string() })
function actor(viewer: ServiceContext, mutate = true) {
  if (!viewer.user_id) throw new UnauthorizedError()
  if (mutate && viewer.is_restricted) throw new RestrictedError()
  if (mutate && !requireVerifiedEmail(viewer).allowed) throw new EmailUnverifiedError()
  return viewer.user_id
}
function moderator(viewer: ServiceContext) {
  const id = actor(viewer)
  if (viewer.role !== 'admin' && viewer.role !== 'superadmin') throw new ForbiddenError()
  return id
}
function cursor(query: PageQuery, scope: string) {
  if (!query.cursor) return null
  try {
    const value = cursorSchema.parse(
      JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')),
    )
    if (value.scope !== scope) throw new Error('Cursor scope mismatch')
    return value
  } catch (cause) {
    throw new ValidationError({ message: 'Некорректный курсор', cause })
  }
}
function next(rows: { id: string; created_at: Date }[], limit: number, scope: string) {
  const last = rows.slice(0, limit).at(-1)
  return rows.length > limit && last
    ? Buffer.from(
        JSON.stringify({ t: last.created_at.toISOString(), id: last.id, scope }),
      ).toString('base64url')
    : null
}
function reportDto(row: {
  id: string
  comment_id: string
  reporter_id: string
  reason: string
  status: 'open' | 'reviewed'
  created_at: Date
}) {
  return {
    id: row.id,
    comment_id: row.comment_id,
    reporter_id: row.reporter_id,
    reason: row.reason,
    status: row.status,
    created_at: row.created_at.toISOString(),
  }
}
export function createCommentInteractionService(
  repository: CommentInteractionRepository,
  comments: CommentService,
  reader: CommentRepository,
  review: (input: {
    id: string
    moderator_id: string
    action: 'dismiss' | 'hide' | 'delete'
    correlation_id: string
  }) => Promise<import('@blog/contracts').CommentReport>,
) {
  return {
    async bookmark(viewer: ServiceContext, id: string, saved: boolean) {
      const user_id = actor(viewer)
      // Removing one's bookmark is allowed even when the article is no longer accessible.
      if (saved) await comments.getThread(viewer, id)
      return repository.bookmark(user_id, id, saved)
    },
    async bookmarks(viewer: ServiceContext, query: PageQuery) {
      const user_id = actor(viewer, false)
      const scope = `bookmarks:${user_id}`
      const rows = await repository.bookmarks(
        viewer,
        user_id,
        cursor(query, scope),
        query.limit + 1,
      )
      const nodes = new Map(
        (
          await comments.getByIds(
            viewer,
            rows.slice(0, query.limit).map((row) => row.id),
          )
        ).map((node) => [node.id, node]),
      )
      return {
        items: rows.slice(0, query.limit).flatMap((row) => {
          const comment = nodes.get(row.id)
          return comment
            ? [
                {
                  comment,
                  article_id: row.article_id,
                  article_title: row.article_title,
                  article_slug: row.article_slug,
                },
              ]
            : []
        }),
        next_cursor: next(rows, query.limit, scope),
      }
    },
    async reactors(viewer: ServiceContext, id: string, kind: ReactionKind, query: PageQuery) {
      await comments.getThread(viewer, id)
      const scope = `reactors:${id}:${kind}`
      const rows = await repository.reactors(id, kind, cursor(query, scope), query.limit + 1)
      return {
        items: rows.slice(0, query.limit).map((row) => ({
          user_id: row.user_id,
          display_name: row.display_name ?? 'Участник',
          avatar_url: row.avatar_url,
        })),
        next_cursor: next(
          rows.map((row) => ({ id: row.user_id, created_at: row.created_at })),
          query.limit,
          scope,
        ),
      }
    },
    async report(viewer: ServiceContext, id: string, reason: string) {
      const user_id = actor(viewer)
      const { target } = await comments.getThread(viewer, id)
      if (target.author.user_id === user_id || target.status !== 'visible')
        throw new ForbiddenError()
      return reportDto(await repository.report(user_id, id, reason))
    },
    async reports(viewer: ServiceContext, query: PageQuery) {
      moderator(viewer)
      const scope = 'reports'
      const rows = await repository.reports(cursor(query, scope), query.limit + 1)
      return {
        items: rows.slice(0, query.limit).map((row) => ({
          ...reportDto(row),
          body: row.body,
          article_id: row.article_id,
          article_slug: row.article_slug,
        })),
        next_cursor: next(rows, query.limit, scope),
      }
    },
    async review(
      viewer: ServiceContext,
      id: string,
      action: 'dismiss' | 'hide' | 'delete',
      correlation_id: string,
    ) {
      const moderator_id = moderator(viewer)
      return review({ id, action, moderator_id, correlation_id })
    },
    async subscription(viewer: ServiceContext, article_id: string, enabled?: boolean) {
      const user_id = actor(viewer, enabled !== undefined)
      const article = await reader.findArticle(article_id)
      if (enabled !== false && (!article || !canReadArticle(viewer, article)))
        throw new NotFoundError()
      return repository.subscription(user_id, article_id, enabled)
    },
    async mentions(viewer: ServiceContext, query: string) {
      actor(viewer, false)
      return (await repository.mentions(query)).map((row) => ({
        ...row,
        display_name: row.display_name ?? 'Участник',
      }))
    },
  }
}
export type CommentInteractionService = ReturnType<typeof createCommentInteractionService>

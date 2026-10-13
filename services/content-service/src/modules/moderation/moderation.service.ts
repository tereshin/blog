import {
  decodeModerationCursor,
  encodeModerationCursor,
  moderationScope,
} from './moderation.cursor.ts'
import { moderationFiltersSchema, reactionCountsSchema } from '@blog/contracts'
import type { ModerationFilters, ServiceContext } from '@blog/contracts'
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '@blog/errors'
import type { StoredArticle } from '../article/article.types.ts'
import type { ModerationArticle, ModerationRepository } from './moderation.repository.ts'

const EMPTY_COUNTS = { laugh: 0, heart: 0, thumb: 0, fire: 0 }

function requireModerator(viewer: ServiceContext): string {
  if (viewer.user_id === undefined) throw new UnauthorizedError()
  if (viewer.role !== 'admin' && viewer.role !== 'superadmin') throw new ForbiddenError()
  return viewer.user_id
}

function card(row: ModerationArticle) {
  const counts = reactionCountsSchema.safeParse(row.article.reaction_counts)
  return {
    id: row.article.id,
    slug: row.article.slug,
    title: row.article.title,
    excerpt: row.article.excerpt,
    first_image_url: row.article.first_image_url,
    published_at: (row.article.published_at ?? row.article.created_at).toISOString(),
    author: {
      user_id: row.article.author_id,
      display_name: row.profile?.display_name ?? '',
      avatar_url: row.profile?.avatar_url ?? null,
      slug: row.profile?.slug ?? String(row.user?.public_number ?? ''),
      status_icon_id: row.profile?.status_icon_id ?? null,
    },
    topic: {
      id: row.topic.id,
      title: row.topic.title,
      slug: row.topic.slug,
      status: row.topic.status,
    },
    reaction_counts: counts.success ? counts.data : EMPTY_COUNTS,
    reaction_count: row.article.reaction_count,
    comment_count: row.article.comment_count,
    bookmark_count: row.article.bookmark_count,
    view_count: row.article.view_count,
    top_comment: null,
    visibility: row.article.visibility,
    comments_enabled: row.article.comments_enabled,
    status: row.article.status,
  }
}

export function createModerationService(repository: ModerationRepository) {
  return {
    async list(
      viewer: ServiceContext,
      filter: 'reported' | 'hidden' | 'search',
      filters: ModerationFilters = moderationFiltersSchema.parse({}),
    ) {
      requireModerator(viewer)
      const scope = moderationScope(filters, filter)
      const page = await repository.list(
        filter,
        filters.limit + 1,
        filters,
        decodeModerationCursor(filters.cursor, scope),
      )
      const last = page.articles.slice(0, filters.limit).at(-1)
      return {
        items: page.articles.slice(0, filters.limit).map((row) => ({
          article: card(row),
          updated_at: row.article.updated_at.toISOString(),
          reports: page.reports
            .filter((report) => report.article_id === row.article.id)
            .map((report) => ({
              id: report.id,
              article_id: report.article_id,
              reporter_id: report.reporter_id,
              created_at: report.created_at.toISOString(),
              status: report.status,
            })),
        })),
        next_cursor:
          page.articles.length > filters.limit && last
            ? encodeModerationCursor({
                t: last.article.updated_at.toISOString(),
                id: last.article.id,
                scope,
                exact: last.article.slug === filters.q,
              })
            : null,
      }
    },

    async listReports(viewer: ServiceContext, filters: ModerationFilters) {
      requireModerator(viewer)
      const scope = moderationScope(filters, 'reports')
      const rows = await repository.listReports(
        filters.limit + 1,
        filters,
        decodeModerationCursor(filters.cursor, scope),
      )
      const last = rows.slice(0, filters.limit).at(-1)
      return {
        items: rows
          .slice(0, filters.limit)
          .map((row) => ({
            article: card(row),
            report: { ...row.report, created_at: row.report.created_at.toISOString() },
          })),
        next_cursor:
          rows.length > filters.limit && last
            ? encodeModerationCursor({
                t: last.report.created_at.toISOString(),
                id: last.report.id,
                scope,
              })
            : null,
      }
    },

    async hide(viewer: ServiceContext, id: string, correlation_id: string): Promise<StoredArticle> {
      const moderator_id = requireModerator(viewer)
      const current = await repository.find(id)
      if (!current || current.status === 'deleted') throw new NotFoundError()
      if (current.status === 'hidden') return current
      if (current.status !== 'published')
        throw new ConflictError({ message: 'Скрыть можно только опубликованную статью' })
      const next = await repository.transition({
        id,
        status: 'hidden',
        event_name: 'content.article.hidden',
        correlation_id,
        moderator_id,
      })
      if (!next) throw new NotFoundError()
      return next
    },

    async restore(
      viewer: ServiceContext,
      id: string,
      correlation_id: string,
    ): Promise<StoredArticle> {
      const moderator_id = requireModerator(viewer)
      const current = await repository.find(id)
      if (!current || current.status === 'deleted') throw new NotFoundError()
      if (current.status === 'published') return current
      if (current.status !== 'hidden')
        throw new ConflictError({ message: 'Вернуть можно только скрытую статью' })
      const next = await repository.transition({
        id,
        status: 'published',
        event_name: 'content.article.restored',
        correlation_id,
        moderator_id,
      })
      if (!next) throw new NotFoundError()
      return next
    },

    async remove(viewer: ServiceContext, id: string, correlation_id: string): Promise<void> {
      const moderator_id = requireModerator(viewer)
      const current = await repository.find(id)
      if (!current || current.status === 'deleted') throw new NotFoundError()
      await repository.transition({
        id,
        status: 'deleted',
        event_name: 'content.article.deleted',
        correlation_id,
        moderator_id,
      })
    },

    async review(
      viewer: ServiceContext,
      id: string,
      action: 'dismiss' | 'hide' | 'delete' = 'dismiss',
      correlation_id = 'moderation',
    ) {
      const moderator_id = requireModerator(viewer)
      const report = await repository.reviewAction({ id, action, moderator_id, correlation_id })
      if (!report) throw new NotFoundError()
      return {
        id: report.id,
        article_id: report.article_id,
        reporter_id: report.reporter_id,
        created_at: report.created_at.toISOString(),
        status: report.status,
      }
    },
  }
}

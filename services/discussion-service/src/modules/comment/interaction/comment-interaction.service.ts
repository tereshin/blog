import { createHash } from 'node:crypto'
import { moderationFiltersSchema } from '@blog/contracts'
import type {
  CommentReport,
  ModerationFilters,
  PageQuery,
  ReactionKind,
  ServiceContext,
} from '@blog/contracts'
import {
  EmailUnverifiedError,
  ForbiddenError,
  NotFoundError,
  RestrictedError,
  UnauthorizedError,
  ValidationError,
} from '@blog/errors'
import { canReadArticle } from '../../../shared/can-read.ts'
import { requireVerifiedEmail } from '../../../shared/require-verified-email.ts'
import { InteractionCursorSchema } from './comment-interaction.schema.ts'
import type { InteractionCursor } from './comment-interaction.schema.ts'
import type {
  CommentArticlesPort,
  CommentInteractionRepositoryPort,
  CommentReaderPort,
  CommentReportRecord,
  CommentReportReviewerPort,
} from './comment-interaction.types.ts'

const ANONYMOUS_NAME = 'Участник'

function requireActor(viewer: ServiceContext, is_mutation = true): string {
  if (!viewer.user_id) throw new UnauthorizedError()
  if (is_mutation && viewer.is_restricted) throw new RestrictedError()
  if (is_mutation && !requireVerifiedEmail(viewer).allowed) throw new EmailUnverifiedError()
  return viewer.user_id
}

function requireModerator(viewer: ServiceContext): string {
  const id = requireActor(viewer)
  if (viewer.role !== 'admin' && viewer.role !== 'superadmin') throw new ForbiddenError()
  return id
}

function parseCursor(query: PageQuery, scope: string): InteractionCursor | null {
  if (!query.cursor) return null
  try {
    const value = InteractionCursorSchema.parse(JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')))
    if (value.scope !== scope) throw new Error('Cursor scope mismatch')
    return value
  } catch (cause) {
    throw new ValidationError({ message: 'Некорректный курсор', cause })
  }
}

function nextCursor(rows: { id: string; created_at: Date }[], limit: number, scope: string): string | null {
  const last = rows.slice(0, limit).at(-1)
  return rows.length > limit && last
    ? Buffer.from(JSON.stringify({ t: last.created_at.toISOString(), id: last.id, scope })).toString('base64url')
    : null
}

function toReportDto(row: CommentReportRecord): CommentReport {
  return {
    id: row.id,
    comment_id: row.comment_id,
    reporter_id: row.reporter_id,
    reason: row.reason,
    status: row.status,
    created_at: row.created_at.toISOString(),
  }
}

export class CommentInteractionService {
  constructor(
    private readonly repository: CommentInteractionRepositoryPort,
    private readonly comments: CommentReaderPort,
    private readonly articles: CommentArticlesPort,
    private readonly reviewer: CommentReportReviewerPort,
  ) {}

  async bookmark(viewer: ServiceContext, id: string, is_saved: boolean) {
    const user_id = requireActor(viewer)
    // Снять свою закладку можно, даже если статья больше недоступна.
    if (is_saved) await this.comments.getThread(viewer, id)
    return this.repository.bookmark(user_id, id, is_saved)
  }

  async bookmarks(viewer: ServiceContext, query: PageQuery) {
    const user_id = requireActor(viewer, false)
    const scope = `bookmarks:${user_id}`
    const rows = await this.repository.bookmarks(viewer, user_id, parseCursor(query, scope), query.limit + 1)
    const page = rows.slice(0, query.limit)
    const comment_by_id = new Map(
      (await this.comments.getByIds(viewer, page.map((row) => row.id))).map((node) => [node.id, node]),
    )
    return {
      items: page.flatMap((row) => {
        const comment = comment_by_id.get(row.id)
        return comment
          ? [{ comment, article_id: row.article_id, article_title: row.article_title, article_slug: row.article_slug }]
          : []
      }),
      next_cursor: nextCursor(rows, query.limit, scope),
    }
  }

  async reactors(viewer: ServiceContext, id: string, kind: ReactionKind, query: PageQuery) {
    await this.comments.getThread(viewer, id)
    const scope = `reactors:${id}:${kind}`
    const rows = await this.repository.reactors(id, kind, parseCursor(query, scope), query.limit + 1)
    return {
      items: rows.slice(0, query.limit).map((row) => ({
        user_id: row.user_id,
        display_name: row.display_name ?? ANONYMOUS_NAME,
        avatar_url: row.avatar_url,
      })),
      next_cursor: nextCursor(
        rows.map((row) => ({ id: row.user_id, created_at: row.created_at })),
        query.limit,
        scope,
      ),
    }
  }

  async report(viewer: ServiceContext, id: string, reason: string): Promise<CommentReport> {
    const user_id = requireActor(viewer)
    const { target } = await this.comments.getThread(viewer, id)
    if (target.author.user_id === user_id || target.status !== 'visible') throw new ForbiddenError()
    return toReportDto(await this.repository.report(user_id, id, reason))
  }

  async reports(viewer: ServiceContext, query: PageQuery & Partial<ModerationFilters>) {
    requireModerator(viewer)
    const filters = moderationFiltersSchema.parse(query)
    const scope = createHash('sha256')
      .update(JSON.stringify(['reports', filters.q, filters.status, filters.sort, filters.from, filters.to]))
      .digest('hex')
    const rows = await this.repository.reports(parseCursor(filters, scope), filters.limit + 1, filters)
    return {
      items: rows.slice(0, query.limit).map((row) => ({
        ...toReportDto(row),
        body: row.body,
        author_id: row.author_id,
        author_name: row.author_name,
        comment_status: row.comment_status,
        article_id: row.article_id,
        article_slug: row.article_slug,
      })),
      next_cursor: nextCursor(rows, query.limit, scope),
    }
  }

  async review(
    viewer: ServiceContext,
    id: string,
    action: 'dismiss' | 'hide' | 'delete',
    correlation_id: string,
  ): Promise<CommentReport> {
    const moderator_id = requireModerator(viewer)
    return this.reviewer.reviewReport({ id, action, moderator_id, correlation_id })
  }

  async subscription(viewer: ServiceContext, article_id: string, enabled?: boolean) {
    const user_id = requireActor(viewer, enabled !== undefined)
    const article = await this.articles.findArticle(article_id)
    if (enabled !== false && (!article || !canReadArticle(viewer, article))) throw new NotFoundError()
    return this.repository.subscription(user_id, article_id, enabled)
  }

  async mentions(viewer: ServiceContext, query: string) {
    requireActor(viewer, false)
    return (await this.repository.mentions(query)).map((row) => ({
      ...row,
      display_name: row.display_name ?? ANONYMOUS_NAME,
    }))
  }
}

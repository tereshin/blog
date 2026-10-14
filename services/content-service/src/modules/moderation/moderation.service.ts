import {
  decodeModerationCursor,
  encodeModerationCursor,
  moderationScope,
} from './moderation.cursor.ts'
import { moderationFiltersSchema, reactionCountsSchema } from '@blog/contracts'
import type { ModerationFilters, ServiceContext } from '@blog/contracts'
import { ForbiddenError, UnauthorizedError } from '@blog/errors'
import type { StoredArticle } from '../article/index.ts'
import {
  ArticleNotHideableError,
  ArticleNotRestorableError,
  ModerationArticleNotFoundError,
  ReportNotFoundError,
} from './moderation.errors.ts'
import type {
  ModerationArticle,
  ModerationArticleEventsPort,
  ModerationCoversPort,
  ModerationEventName,
  ModerationListFilter,
  ModerationReport,
  ModerationRepositoryPort,
} from './moderation.types.ts'

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

type ReviewAction = 'dismiss' | 'hide' | 'delete'

function toReport(report: ModerationReport) {
  return {
    id: report.id,
    article_id: report.article_id,
    reporter_id: report.reporter_id,
    created_at: report.created_at.toISOString(),
    status: report.status,
  }
}

export class ModerationService<TTx> {
  constructor(
    private readonly repository: ModerationRepositoryPort<TTx>,
    private readonly articles: ModerationArticleEventsPort<TTx>,
    private readonly covers: ModerationCoversPort<TTx>,
  ) {}

  async list(viewer: ServiceContext, filter: ModerationListFilter, filters: ModerationFilters = moderationFiltersSchema.parse({})) {
    requireModerator(viewer)
    const scope = moderationScope(filters, filter)
    const page = await this.repository.list(filter, filters.limit + 1, filters, decodeModerationCursor(filters.cursor, scope))
    const last = page.articles.slice(0, filters.limit).at(-1)
    return {
      items: page.articles.slice(0, filters.limit).map((row) => ({
        article: card(row),
        updated_at: row.article.updated_at.toISOString(),
        reports: page.reports.filter((report) => report.article_id === row.article.id).map(toReport),
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
  }

  async listReports(viewer: ServiceContext, filters: ModerationFilters) {
    requireModerator(viewer)
    const scope = moderationScope(filters, 'reports')
    const rows = await this.repository.listReports(filters.limit + 1, filters, decodeModerationCursor(filters.cursor, scope))
    const last = rows.slice(0, filters.limit).at(-1)
    return {
      items: rows.slice(0, filters.limit).map((row) => ({ article: card(row), report: toReport(row.report) })),
      next_cursor:
        rows.length > filters.limit && last
          ? encodeModerationCursor({ t: last.report.created_at.toISOString(), id: last.report.id, scope })
          : null,
    }
  }

  async hide(viewer: ServiceContext, id: string, correlation_id: string): Promise<StoredArticle> {
    const moderator_id = requireModerator(viewer)
    const current = await this.repository.find(id)
    if (!current || current.status === 'deleted') throw new ModerationArticleNotFoundError()
    if (current.status === 'hidden') return current
    if (current.status !== 'published') throw new ArticleNotHideableError()
    const next = await this.transition(id, 'hidden', 'content.article.hidden', correlation_id, moderator_id)
    if (!next) throw new ModerationArticleNotFoundError()
    return next
  }

  async restore(viewer: ServiceContext, id: string, correlation_id: string): Promise<StoredArticle> {
    const moderator_id = requireModerator(viewer)
    const current = await this.repository.find(id)
    if (!current || current.status === 'deleted') throw new ModerationArticleNotFoundError()
    if (current.status === 'published') return current
    if (current.status !== 'hidden') throw new ArticleNotRestorableError()
    const next = await this.transition(id, 'published', 'content.article.restored', correlation_id, moderator_id)
    if (!next) throw new ModerationArticleNotFoundError()
    return next
  }

  async remove(viewer: ServiceContext, id: string, correlation_id: string): Promise<void> {
    const moderator_id = requireModerator(viewer)
    const current = await this.repository.find(id)
    if (!current || current.status === 'deleted') throw new ModerationArticleNotFoundError()
    await this.transition(id, 'deleted', 'content.article.deleted', correlation_id, moderator_id)
  }

  async review(viewer: ServiceContext, id: string, action: ReviewAction = 'dismiss', correlation_id = 'moderation') {
    const moderator_id = requireModerator(viewer)
    const report = await this.repository.transaction(async (tx) => {
      const locked = await this.repository.lockReport(tx, id)
      if (!locked) throw new ReportNotFoundError()
      if (locked.status === 'reviewed') return locked
      if (action !== 'dismiss') await this.applyReportAction(tx, locked.article_id, action, correlation_id, moderator_id)
      return (await this.repository.markReviewed(tx, locked.id)) ?? locked
    })
    return toReport(report)
  }

  private async applyReportAction(tx: TTx, article_id: string, action: 'hide' | 'delete', correlation_id: string, moderator_id: string): Promise<void> {
    const current = await this.repository.lockArticle(tx, article_id)
    if (!current) throw new ModerationArticleNotFoundError()
    const status = action === 'hide' ? 'hidden' : 'deleted'
    if (current.status === status || current.status === 'deleted') return
    const next = await this.repository.setStatus(tx, current.id, status)
    if (!next) throw new ModerationArticleNotFoundError()
    await this.covers.requestArticleCover(tx, next.id, correlation_id)
    await this.articles.appendEvent(tx, action === 'hide' ? 'content.article.hidden' : 'content.article.deleted', next, correlation_id, moderator_id)
    if (action === 'hide') await this.articles.appendEvent(tx, 'content.article.updated', next, correlation_id)
  }

  private transition(
    id: string,
    status: StoredArticle['status'],
    event_name: ModerationEventName,
    correlation_id: string,
    moderator_id: string,
  ): Promise<StoredArticle | null> {
    return this.repository.transaction(async (tx) => {
      const next = await this.repository.setStatus(tx, id, status)
      if (!next) return null
      await this.covers.requestArticleCover(tx, next.id, correlation_id)
      await this.articles.appendEvent(tx, event_name, next, correlation_id, moderator_id)
      if (event_name !== 'content.article.deleted') await this.articles.appendEvent(tx, 'content.article.updated', next, correlation_id)
      return next
    })
  }
}

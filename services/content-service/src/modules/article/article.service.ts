import { z } from 'zod'
import { blocksDocumentSchema, reactionCountsSchema } from '@blog/contracts'
import type { Article, ArticleAccessFields, FeedCard, ReactionCounts, ServiceContext } from '@blog/contracts'
import { canRead } from '../access/index.ts'
import { ArticleMembersOnlyError, ArticleUnavailableError } from './article.errors.ts'
import type { ArticleRepository, ArticleRow, ArticleService } from './article.types.ts'
import { createArticleWrite } from './article.write.ts'
import type { ArticleWriteOptions } from './article.write.ts'

const EMPTY_COUNTS: ReactionCounts = { laugh: 0, heart: 0, thumb: 0, fire: 0 }
const TOP_COMMENT_EXCERPT_LENGTH = 140
const storedTopCommentSchema = z.looseObject({ id: z.uuid(), author_id: z.uuid(), body: z.string() })

export type ReadFailure = 'members_only' | 'unavailable'

/** Гость на опубликованной статье «только участникам» получает 401; любой другой отказ — 404 без текста. */
export function readFailure(viewer: ServiceContext, article: ArticleAccessFields): ReadFailure | null {
  if (canRead(viewer, article)) return null
  if (article.status === 'published' && article.visibility === 'members' && viewer.role === 'guest') return 'members_only'
  return 'unavailable'
}

export function assertCanRead(viewer: ServiceContext, article: ArticleAccessFields): void {
  const failure = readFailure(viewer, article)
  if (failure === 'members_only') throw new ArticleMembersOnlyError()
  if (failure === 'unavailable') throw new ArticleUnavailableError()
}

function excerptOf(text: string): string {
  const clean = text.replaceAll(/\s+/g, ' ').trim()
  return clean.length > TOP_COMMENT_EXCERPT_LENGTH ? `${clean.slice(0, TOP_COMMENT_EXCERPT_LENGTH - 1).trimEnd()}…` : clean
}

function countsOf(value: unknown): ReactionCounts {
  const parsed = reactionCountsSchema.safeParse(value)
  return parsed.success ? parsed.data : EMPTY_COUNTS
}

function authorOf(row: ArticleRow) {
  return {
    user_id: row.author_id,
    display_name: row.author_display_name ?? '',
    avatar_url: row.author_avatar_url,
    slug: row.author_slug ?? String(row.author_public_number ?? ''),
  }
}

function topicOf(row: ArticleRow) {
  return { id: row.topic_id, title: row.topic_title, slug: row.topic_slug, status: row.topic_status }
}

function topCommentOf(row: ArticleRow, profiles_by_id: Map<string, { display_name: string; avatar_url: string | null }>): FeedCard['top_comment'] {
  const stored = storedTopCommentSchema.safeParse(row.top_comment)
  if (!stored.success) return null
  const author = profiles_by_id.get(stored.data.author_id)
  if (!author) return null
  return { id: stored.data.id, author_name: author.display_name, author_avatar_url: author.avatar_url, excerpt: excerptOf(stored.data.body) }
}

function toCard(row: ArticleRow, profiles_by_id: Map<string, { display_name: string; avatar_url: string | null }>): FeedCard | null {
  if (!row.published_at) return null
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    first_image_url: row.first_image_url,
    published_at: row.published_at.toISOString(),
    author: authorOf(row),
    topic: topicOf(row),
    reaction_counts: countsOf(row.reaction_counts),
    reaction_count: row.reaction_count,
    comment_count: row.comment_count,
    bookmark_count: row.bookmark_count,
    view_count: row.view_count,
    top_comment: topCommentOf(row, profiles_by_id),
    visibility: row.visibility,
    comments_enabled: row.comments_enabled,
  }
}

export function createArticleService(repository: ArticleRepository, options: ArticleWriteOptions): ArticleService {
  return {
    ...createArticleWrite(repository, options),
    async getBySlug(viewer, slug) {
      const row = await repository.findBySlug(slug)
      if (!row) throw new ArticleUnavailableError()
      assertCanRead(viewer, { author_id: row.author_id, visibility: row.visibility, status: row.status })
      const blocks = blocksDocumentSchema.safeParse(row.blocks)
      if (!blocks.success) throw new Error(`статья ${row.id} хранит документ блоков вне схемы`)
      const article: Article = {
        id: row.id,
        slug: row.slug,
        title: row.title,
        blocks: blocks.data,
        author: authorOf(row),
        topic: topicOf(row),
        published_at: row.published_at ? row.published_at.toISOString() : null,
        visibility: row.visibility,
        comments_enabled: row.comments_enabled,
        status: row.status,
        reaction_counts: countsOf(row.reaction_counts),
        reaction_count: row.reaction_count,
        comment_count: row.comment_count,
        bookmark_count: row.bookmark_count,
        view_count: row.view_count,
        is_own: viewer.user_id !== undefined && viewer.user_id === row.author_id,
      }
      return article
    },

    async getByIds(viewer, ids) {
      const rows = await repository.findVisibleByIds(viewer, ids)
      const top_ids = rows.flatMap((row) => {
        const stored = storedTopCommentSchema.safeParse(row.top_comment)
        return stored.success ? [stored.data.author_id] : []
      })
      const profiles_by_id = await repository.findProfiles([...new Set(top_ids)])
      return { items: rows.flatMap((row) => {
        const card = toCard(row, profiles_by_id)
        return card ? [card] : []
      }) }
    },
  }
}

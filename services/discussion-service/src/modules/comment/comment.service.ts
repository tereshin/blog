import { REACTION_KINDS, canReadArticle, requireVerifiedEmail } from '@blog/contracts'
import type { ReactionCounts, ReactionKind } from '@blog/contracts'
import { EmailUnverifiedError, ForbiddenError, RestrictedError, UnauthorizedError, ValidationError } from '@blog/errors'
import { CommentArticleNotFoundError, CommentsDisabledError } from './comment.errors.ts'
import { toExcerpt } from './comment.excerpt.ts'
import { POPULAR_COMMENTS_LIMIT, decodeCommentCursor, decodeUserCommentCursor, encodeCommentCursor, encodeUserCommentCursor } from './comment.schema.ts'
import type { CommentRepository, CommentService } from './comment.types.ts'
import type { CommentWriter } from './comment.write.ts'
import { assembleCommentTree, emptyCounts } from './comment.tree.ts'

const ANONYMOUS_NAME = 'Участник'

function indexCounts(rows: { target_id: string; kind: ReactionKind; total: number }[]): Map<string, ReactionCounts> {
  const facts = new Map<string, ReactionCounts>()
  for (const row of rows) {
    const counts = facts.get(row.target_id) ?? emptyCounts()
    if (REACTION_KINDS.includes(row.kind)) counts[row.kind] = row.total
    facts.set(row.target_id, counts)
  }
  return facts
}

function requireActor(viewer: Parameters<CommentService['create']>[0]['viewer']): string {
  if (viewer.user_id === undefined) throw new UnauthorizedError()
  if (viewer.is_restricted) throw new RestrictedError()
  if (!requireVerifiedEmail(viewer).allowed) throw new EmailUnverifiedError()
  return viewer.user_id
}

function requireModerator(viewer: Parameters<CommentService['create']>[0]['viewer']): string {
  if (viewer.user_id === undefined) throw new UnauthorizedError()
  if (viewer.role !== 'admin' && viewer.role !== 'superadmin') throw new ForbiddenError()
  return viewer.user_id
}

export function createCommentService(repository: CommentRepository, writer: CommentWriter): CommentService {
  return {
    async getPopular(viewer) {
      const rows = await repository.findPopular(viewer, POPULAR_COMMENTS_LIMIT)
      return rows.map((row) => ({
        id: row.id,
        author_name: row.author_name ?? ANONYMOUS_NAME,
        author_avatar_url: row.author_avatar_url,
        article_id: row.article_id,
        article_title: row.article_title,
        article_slug: row.article_slug,
        excerpt: toExcerpt(row.body),
        reaction_count: row.reaction_count,
      }))
    },

    async listForArticle(viewer, article_id, query) {
      const article = await repository.findArticle(article_id)
      if (!article || !canReadArticle(viewer, article)) throw new CommentArticleNotFoundError()
      let cursor = null
      if (query.cursor) {
        try {
          cursor = decodeCommentCursor(query.cursor)
        } catch (error) {
          throw new ValidationError({ message: 'Некорректный курсор', cause: error })
        }
      }
      const roots = await repository.listRoots(article_id, cursor, query.limit + 1)
      const page = roots.slice(0, query.limit)
      const last = page.at(-1)
      const replies = await repository.listReplies(page.map((row) => row.id))
      const ids = [...page, ...replies].map((row) => row.id)
      const facts = indexCounts(await repository.countReactions(ids))
      const mine = new Map<string, ReactionKind>()
      if (viewer.user_id) {
        for (const row of await repository.findMine(viewer.user_id, ids)) mine.set(row.target_id, row.kind)
      }
      return {
        comments: assembleCommentTree(page, replies, facts, mine),
        next_cursor: roots.length > query.limit && last ? encodeCommentCursor({ t: last.created_at.toISOString(), id: last.id }) : null,
      }
    },

    async listByAuthor(viewer, author_id, sort, query) {
      let cursor = null
      if (query.cursor) {
        try {
          cursor = decodeUserCommentCursor(query.cursor)
        } catch (error) {
          throw new ValidationError({ message: 'Некорректный курсор', cause: error })
        }
      }
      const rows = await repository.listByAuthor(viewer, author_id, sort, cursor, query.limit + 1)
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        items: page.map((row) => ({
          id: row.id,
          excerpt: toExcerpt(row.body),
          article_id: row.article_id,
          article_title: row.article_title,
          article_slug: row.article_slug,
          created_at: row.created_at.toISOString(),
          reaction_count: row.reaction_count,
        })),
        next_cursor:
          rows.length > query.limit && last
            ? encodeUserCommentCursor(
                sort === 'popular'
                  ? { k: 'score', s: last.reaction_count, id: last.id }
                  : { k: 'time', t: last.created_at.toISOString(), id: last.id },
              )
            : null,
      }
    },

    async create(input) {
      const user_id = requireActor(input.viewer)
      const article = await repository.findArticle(input.article_id)
      if (!article || !canReadArticle(input.viewer, article)) throw new CommentArticleNotFoundError()
      if (!article.comments_enabled) throw new CommentsDisabledError()
      return writer.insert({
        user_id,
        article_id: input.article_id,
        body: input.body,
        parent_id: input.parent_id,
        idempotency_key: input.idempotency_key,
        correlation_id: input.correlation_id,
      })
    },

    async update(input) {
      const user_id = requireActor(input.viewer)
      return writer.update({
        user_id,
        comment_id: input.comment_id,
        body: input.body,
        idempotency_key: input.idempotency_key,
        correlation_id: input.correlation_id,
      })
    },

    async remove(input) {
      const user_id = requireActor(input.viewer)
      return writer.remove({
        user_id,
        comment_id: input.comment_id,
        idempotency_key: input.idempotency_key,
        correlation_id: input.correlation_id,
      })
    },

    async hide(input) {
      const moderator_id = requireModerator(input.viewer)
      return writer.moderate({ comment_id: input.comment_id, status: 'hidden', correlation_id: input.correlation_id, moderator_id })
    },

    async restore(input) {
      const moderator_id = requireModerator(input.viewer)
      return writer.moderate({ comment_id: input.comment_id, status: 'visible', correlation_id: input.correlation_id, moderator_id })
    },

    async moderateRemove(input) {
      const moderator_id = requireModerator(input.viewer)
      return writer.moderate({ comment_id: input.comment_id, status: 'deleted', correlation_id: input.correlation_id, moderator_id })
    },
  }
}

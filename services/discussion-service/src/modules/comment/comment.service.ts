import { REACTION_KINDS, canReadArticle } from '@blog/contracts'
import type { ReactionCounts, ReactionKind } from '@blog/contracts'
import { ValidationError } from '@blog/errors'
import { CommentArticleNotFoundError } from './comment.errors.ts'
import { COMMENT_EXCERPT_LENGTH, POPULAR_COMMENTS_LIMIT, decodeCommentCursor, encodeCommentCursor } from './comment.schema.ts'
import type { CommentRepository, CommentService } from './comment.types.ts'
import { assembleCommentTree, emptyCounts } from './comment.tree.ts'

const ANONYMOUS_NAME = 'Участник'

/** Фрагмент для правой карточки: пробелы схлопнуты, длинный текст обрезан по границе слова с «…». */
export function toExcerpt(body: string, max = COMMENT_EXCERPT_LENGTH): string {
  const text = body.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const last_space = cut.lastIndexOf(' ')
  return `${(last_space > max / 2 ? cut.slice(0, last_space) : cut).trimEnd()}…`
}

function indexCounts(rows: { target_id: string; kind: ReactionKind; total: number }[]): Map<string, ReactionCounts> {
  const facts = new Map<string, ReactionCounts>()
  for (const row of rows) {
    const counts = facts.get(row.target_id) ?? emptyCounts()
    if (REACTION_KINDS.includes(row.kind)) counts[row.kind] = row.total
    facts.set(row.target_id, counts)
  }
  return facts
}

export function createCommentService(repository: CommentRepository): CommentService {
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
  }
}

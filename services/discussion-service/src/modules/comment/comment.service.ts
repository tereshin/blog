import type { PopularComment, ServiceContext } from '@blog/contracts'
import { COMMENT_EXCERPT_LENGTH, POPULAR_COMMENTS_LIMIT } from './comment.schema.ts'
import type { CommentRepository } from './comment.types.ts'

const ANONYMOUS_NAME = 'Участник'

/** Фрагмент для правой карточки: пробелы схлопнуты, длинный текст обрезан по границе слова с «…». */
export function toExcerpt(body: string, max = COMMENT_EXCERPT_LENGTH): string {
  const text = body.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const last_space = cut.lastIndexOf(' ')
  return `${(last_space > max / 2 ? cut.slice(0, last_space) : cut).trimEnd()}…`
}

export type CommentService = {
  getPopular: (viewer: ServiceContext) => Promise<PopularComment[]>
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
  }
}

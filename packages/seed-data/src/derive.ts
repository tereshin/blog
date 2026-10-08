import { REACTION_KINDS } from './types.ts'
import type { ArticleDerived, Badges, CommentDerived, DatasetBody, Derived, ReactionKind, SeedComment } from './types.ts'

type DeriveInput = Pick<DatasetBody, 'users' | 'articles' | 'comments' | 'reactions' | 'views' | 'bookmarks'>

function emptyCounts(): Record<ReactionKind, number> {
  return { laugh: 0, heart: 0, thumb: 0, fire: 0 }
}

/** Комментарий занимает место в обсуждении: он виден или оставлен заглушкой, потому что под ним есть видимые ответы. */
export function occupiesDiscussion(comment: SeedComment, replies: readonly SeedComment[]): boolean {
  return comment.status === 'visible' || replies.some((reply) => reply.status === 'visible')
}

function oneYearPassed(created_at: Date, anchor: Date): boolean {
  const threshold = new Date(created_at)
  threshold.setUTCFullYear(threshold.getUTCFullYear() + 1)
  return threshold.getTime() <= anchor.getTime()
}

/**
 * Все счётчики, репутация и знаки считаются из тех же записей, что кладутся в таблицы, —
 * поэтому пересчёт владельцем после seed даёт то же число.
 */
export function derive(input: DeriveInput, anchor: Date): Derived {
  const repliesOf = new Map<string, SeedComment[]>()
  for (const comment of input.comments) {
    if (comment.parent_id === null) continue
    repliesOf.set(comment.parent_id, [...(repliesOf.get(comment.parent_id) ?? []), comment])
  }

  const comment_reactions = new Map<string, number>()
  const article_reactions = new Map<string, Record<ReactionKind, number>>()
  for (const reaction of input.reactions) {
    if (reaction.target_type === 'comment') {
      comment_reactions.set(reaction.target_id, (comment_reactions.get(reaction.target_id) ?? 0) + 1)
    } else {
      const counts = article_reactions.get(reaction.target_id) ?? emptyCounts()
      counts[reaction.kind] += 1
      article_reactions.set(reaction.target_id, counts)
    }
  }

  const comments = new Map<string, CommentDerived>()
  for (const comment of input.comments) {
    comments.set(comment.id, {
      reaction_count: comment_reactions.get(comment.id) ?? 0,
      reply_count: (repliesOf.get(comment.id) ?? []).filter((reply) => reply.status === 'visible').length,
    })
  }

  const view_counts = new Map<string, number>()
  for (const view of input.views) view_counts.set(view.article_id, (view_counts.get(view.article_id) ?? 0) + 1)
  const bookmark_counts = new Map<string, number>()
  for (const bookmark of input.bookmarks) bookmark_counts.set(bookmark.article_id, (bookmark_counts.get(bookmark.article_id) ?? 0) + 1)

  const comments_by_article = new Map<string, SeedComment[]>()
  for (const comment of input.comments) comments_by_article.set(comment.article_id, [...(comments_by_article.get(comment.article_id) ?? []), comment])

  const articles = new Map<string, ArticleDerived>()
  for (const article of input.articles) {
    const own = comments_by_article.get(article.id) ?? []
    const counts = article_reactions.get(article.id) ?? emptyCounts()
    const visible = own.filter((comment) => comment.status === 'visible')
    const best = [...visible].sort((left, right) => {
      const score = (comment: SeedComment): number => {
        const derived = comments.get(comment.id)
        return (derived?.reply_count ?? 0) + (derived?.reaction_count ?? 0)
      }
      return score(right) - score(left) || left.created_at.getTime() - right.created_at.getTime() || left.id.localeCompare(right.id)
    })[0]
    const best_derived = best ? comments.get(best.id) : undefined
    articles.set(article.id, {
      reaction_counts: counts,
      reaction_count: REACTION_KINDS.reduce((sum, kind) => sum + counts[kind], 0),
      comment_count: own.filter((comment) => occupiesDiscussion(comment, repliesOf.get(comment.id) ?? [])).length,
      view_count: view_counts.get(article.id) ?? 0,
      bookmark_count: bookmark_counts.get(article.id) ?? 0,
      top_comment:
        best && best_derived
          ? { id: best.id, author_id: best.author_id, body: best.body, reaction_count: best_derived.reaction_count, reply_count: best_derived.reply_count }
          : null,
    })
  }

  // Репутация: реакции на опубликованные статьи и видимые комментарии человека.
  const reputation = new Map<string, number>(input.users.map((user) => [user.id, 0]))
  const published_author = new Map(input.articles.filter((article) => article.status === 'published').map((article) => [article.id, article.author_id]))
  const visible_author = new Map(input.comments.filter((comment) => comment.status === 'visible').map((comment) => [comment.id, comment.author_id]))
  for (const reaction of input.reactions) {
    const owner = (reaction.target_type === 'article' ? published_author : visible_author).get(reaction.target_id)
    if (owner !== undefined) reputation.set(owner, (reputation.get(owner) ?? 0) + 1)
  }

  const authors_with_post = new Set(published_author.values())
  const badges = new Map<string, Badges>()
  for (const user of input.users) {
    badges.set(user.id, {
      first_post: authors_with_post.has(user.id),
      ten_reactions: (reputation.get(user.id) ?? 0) >= 10,
      one_year: oneYearPassed(user.created_at, anchor),
    })
  }
  return { articles, comments, reputation, badges }
}

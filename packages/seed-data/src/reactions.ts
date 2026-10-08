import { at } from './anchor.ts'
import { articleId } from './articles.ts'
import { commentId } from './comments.ts'
import { userId } from './participants.ts'
import { REACTION_KINDS } from './types.ts'
import type { SeedReaction } from './types.ts'

const HOUR = 60 * 60 * 1000

/** Накопитель с проверкой «одна реакция участника на объект»: повтор — ошибка данных, а не молчаливый пропуск. */
export class ReactionSet {
  readonly items: SeedReaction[] = []
  private readonly seen = new Set<string>()

  add(reaction: SeedReaction): void {
    const key = `${reaction.user_id}:${reaction.target_type}:${reaction.target_id}`
    if (this.seen.has(key)) throw new Error(`Вторая реакция участника на один объект: ${key}`)
    this.seen.add(key)
    this.items.push(reaction)
  }
}

/**
 * Реакции малого набора. Все четыре вида есть и на статье, и на комментарии. У `author_b` реакций на
 * опубликованные статьи не меньше десяти (знак «10 реакций»), у `newcomer` материалов и реакций на них нет.
 */
export function buildSmallReactions(anchor: Date): SeedReaction[] {
  const set = new ReactionSet()
  const kindAt = (index: number) => REACTION_KINDS[index % REACTION_KINDS.length] ?? 'heart'
  const onArticle = (user: string, article_key: string, index: number): void =>
    set.add({ user_id: userId(user), target_type: 'article', target_id: articleId(article_key), kind: kindAt(index), created_at: at(anchor, -(index + 1) * HOUR) })
  const onComment = (user: string, name: string, kind: SeedReaction['kind'], index: number): void =>
    set.add({ user_id: userId(user), target_type: 'comment', target_id: commentId(`small:${name}`), kind, created_at: at(anchor, -(index + 1) * HOUR) })

  // Статья с реакциями всех четырёх видов.
  onArticle('superadmin', 'published_long_with_image', 0)
  onArticle('admin', 'published_long_with_image', 1)
  onArticle('reader', 'published_long_with_image', 2)
  onArticle('author_b', 'published_long_with_image', 3)

  // Реакции на опубликованные статьи author_b: шесть участников на каждую.
  const reactors = ['superadmin', 'admin', 'author_a', 'reader', 'no_publish', 'newcomer'] as const
  for (const article_key of ['published_author_only', 'published_comments_off', 'published_promoted', 'published_in_archived_topic']) {
    reactors.forEach((user, index) => onArticle(user, article_key, index + 4))
  }
  // Реакция на скрытую статью есть, но в репутацию не входит.
  onArticle('reader', 'hidden_by_moderator', 5)

  // Остальные статьи author_a и рядовые.
  onArticle('reader', 'published_short', 6)
  onArticle('author_b', 'published_short', 7)
  onArticle('admin', 'published_members_only', 8)
  onArticle('reader', 'published_with_attachment', 9)
  for (const number of [1, 3, 6, 9, 12, 15, 18, 21]) {
    onArticle(number % 2 === 0 ? 'reader' : 'author_b', `small:${String(number).padStart(3, '0')}`, number)
  }

  // Комментарии: все четыре вида.
  onComment('author_a', 'root_with_replies', 'heart', 0)
  onComment('admin', 'root_with_replies', 'thumb', 1)
  onComment('author_b', 'root_with_replies', 'fire', 2)
  onComment('superadmin', 'root_with_replies', 'laugh', 3)
  onComment('reader', 'popular_root', 'thumb', 4)
  onComment('author_a', 'popular_root', 'heart', 5)
  onComment('reader', 'reply_by_author', 'heart', 6)
  onComment('author_a', 'short_root', 'thumb', 7)
  onComment('reader', 'edited', 'fire', 8)
  // Реакция на скрытый комментарий в репутацию не входит.
  onComment('reader', 'hidden_by_moderator', 'laugh', 9)
  return set.items
}

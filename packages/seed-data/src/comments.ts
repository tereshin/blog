import { at } from './anchor.ts'
import { articleId } from './articles.ts'
import { seedId } from './ids.ts'
import { userId } from './participants.ts'
import type { CommentStatus, SeedComment } from './types.ts'

export function commentId(key: string): string {
  return seedId('comment', key)
}

type CommentInput = {
  name: string
  article_key: string
  author_key: string
  /** Имя родителя среди комментариев малого набора. */
  parent?: string
  status?: CommentStatus
  body?: string
  /** Через сколько часов после публикации статьи (часы от якоря назад задаются `hours_ago`). */
  hours_ago: number
  edited?: boolean
}

/**
 * Комментарии малого набора: корневой, с ответами, ответ, удалённый с ответами (заглушка),
 * скрытый модератором, правленый. У заглушек тело пустое.
 */
export function buildSmallComments(anchor: Date): SeedComment[] {
  const inputs: CommentInput[] = [
    { name: 'root_with_replies', article_key: 'published_long_with_image', author_key: 'reader', body: 'Отличный текст, особенно про границы между слоями.', hours_ago: 20 },
    { name: 'reply_by_author', article_key: 'published_long_with_image', author_key: 'author_a', parent: 'root_with_replies', body: 'Спасибо! Границы — самое недооценённое.', hours_ago: 18 },
    { name: 'reply_by_other', article_key: 'published_long_with_image', author_key: 'author_b', parent: 'root_with_replies', body: 'Добавлю: их стоит проверять линтером.', hours_ago: 16 },
    { name: 'deleted_with_replies', article_key: 'published_long_with_image', author_key: 'author_b', status: 'deleted', body: '', hours_ago: 15 },
    { name: 'reply_to_deleted', article_key: 'published_long_with_image', author_key: 'reader', parent: 'deleted_with_replies', body: 'Жаль, что комментарий удалили — он был полезным.', hours_ago: 14 },
    { name: 'hidden_by_moderator', article_key: 'published_long_with_image', author_key: 'no_publish', status: 'hidden', body: '', hours_ago: 12 },
    { name: 'edited', article_key: 'published_long_with_image', author_key: 'author_b', body: 'Поправил формулировку: речь именно о границах модулей.', hours_ago: 10, edited: true },
    { name: 'popular_root', article_key: 'published_long_with_image', author_key: 'admin', body: 'Закрепил бы это в руководстве для новых людей.', hours_ago: 8 },
    { name: 'short_root', article_key: 'published_short', author_key: 'reader', body: 'Коротко и по делу.', hours_ago: 40 },
    { name: 'short_reply', article_key: 'published_short', author_key: 'author_a', parent: 'short_root', body: 'Рада, что пригодилось.', hours_ago: 38 },
    { name: 'legacy_before_off', article_key: 'published_comments_off', author_key: 'reader', body: 'Написано, пока комментарии были включены.', hours_ago: 90 },
    { name: 'members_comment', article_key: 'published_members_only', author_key: 'author_b', body: 'Читаю как участник.', hours_ago: 60 },
    { name: 'promoted_root', article_key: 'published_promoted', author_key: 'reader', body: 'Хороший пример продвижения.', hours_ago: 100 },
    { name: 'promoted_other', article_key: 'published_promoted', author_key: 'author_a', body: 'Интересно, сколько людей дошло до конца.', hours_ago: 96 },
    { name: 'attachment_root', article_key: 'published_with_attachment', author_key: 'admin', body: 'Вложение открылось, всё в порядке.', hours_ago: 110 },
    { name: 'filler_root', article_key: 'small:001', author_key: 'reader', body: 'Любопытная заметка.', hours_ago: 130 },
  ]
  const ids = new Map(inputs.map((input) => [input.name, commentId(`small:${input.name}`)]))
  return inputs.map((input) => {
    const created_at = at(anchor, -(input.hours_ago * 60 * 60 * 1000))
    const parent = input.parent === undefined ? null : ids.get(input.parent)
    if (parent === undefined) throw new Error(`Нет родителя ${input.parent} у комментария ${input.name}`)
    return {
      key: `small:${input.name}`,
      id: ids.get(input.name) ?? '',
      article_id: articleId(input.article_key),
      author_id: userId(input.author_key),
      parent_id: parent,
      body: input.body ?? '',
      status: input.status ?? 'visible',
      edited_at: input.edited ? new Date(created_at.getTime() + 30 * 60 * 1000) : null,
      created_at,
    }
  })
}


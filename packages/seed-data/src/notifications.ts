import { at } from './anchor.ts'
import { articleId } from './articles.ts'
import { commentId } from './comments.ts'
import { conversationId } from './conversations.ts'
import { seedId } from './ids.ts'
import { userId } from './participants.ts'
import type { NotificationKind, SeedNotification } from './types.ts'

const HOUR = 60 * 60 * 1000

type NotificationInput = {
  name: string
  user: string
  kind: NotificationKind
  article?: string
  comment?: string
  conversation?: string
  hours_ago: number
  is_read: boolean
}

/** По каждому из пяти видов — прочитанное и непрочитанное. Ссылки ведут на записи малого набора. */
export function buildSmallNotifications(anchor: Date): SeedNotification[] {
  const inputs: NotificationInput[] = [
    { name: 'comment-unread', user: 'author_a', kind: 'comment', article: 'published_long_with_image', comment: 'root_with_replies', hours_ago: 20, is_read: false },
    { name: 'comment-read', user: 'author_b', kind: 'comment', article: 'published_promoted', comment: 'promoted_root', hours_ago: 100, is_read: true },
    { name: 'reply-unread', user: 'reader', kind: 'reply', article: 'published_long_with_image', comment: 'reply_by_author', hours_ago: 18, is_read: false },
    { name: 'reply-read', user: 'reader', kind: 'reply', article: 'published_short', comment: 'short_reply', hours_ago: 38, is_read: true },
    { name: 'reaction-unread', user: 'author_a', kind: 'reaction', article: 'published_long_with_image', hours_ago: 24, is_read: false },
    { name: 'reaction-read', user: 'author_b', kind: 'reaction', article: 'published_promoted', hours_ago: 80, is_read: true },
    { name: 'message-unread', user: 'reader', kind: 'message', conversation: 'reader-author_a', hours_ago: 3, is_read: false },
    { name: 'message-read', user: 'author_a', kind: 'message', conversation: 'reader-author_a', hours_ago: 26, is_read: true },
    { name: 'moderation-unread', user: 'author_b', kind: 'moderation', article: 'hidden_by_moderator', hours_ago: 150, is_read: false },
    { name: 'moderation-read', user: 'no_publish', kind: 'moderation', article: 'published_long_with_image', comment: 'hidden_by_moderator', hours_ago: 12, is_read: true },
  ]
  return inputs.map((input) => {
    const created_at = at(anchor, -input.hours_ago * HOUR)
    return {
      id: seedId('notification', input.name),
      user_id: userId(input.user),
      kind: input.kind,
      article_id: input.article ? articleId(input.article) : null,
      comment_id: input.comment ? commentId(`small:${input.comment}`) : null,
      conversation_id: input.conversation ? conversationId(input.conversation) : null,
      read_at: input.is_read ? new Date(created_at.getTime() + HOUR) : null,
      created_at,
    }
  })
}

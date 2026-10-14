import type {
  CommentCreatedV1,
  MessageSentV1,
  Notification,
  NotificationPage,
  ReactionAddedV1,
  ServiceContext,
  UnreadCount,
} from '@blog/contracts'
import { UnauthorizedError } from '@blog/errors'
import { NotificationNotFoundError } from './notification.errors.ts'
import { decodeNotificationCursor, encodeNotificationCursor } from './notification.schema.ts'
import type { NotificationQuery } from './notification.schema.ts'
import type { ArticleCopy, NotificationRepositoryPort, NotificationRow, NotificationSource, UserCopy } from './notification.types.ts'

type CommentKind = 'comment' | 'reply' | 'mention'

function requireUser(viewer: ServiceContext): string {
  if (!viewer.user_id) throw new UnauthorizedError()
  return viewer.user_id
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    kind: row.kind,
    article_id: row.article_id,
    article_slug: row.article_slug,
    article_title: row.article_title,
    comment_id: row.comment_id,
    conversation_id: row.conversation_id,
    actor: { display_name: row.actor_display_name ?? '', avatar_url: row.actor_avatar_url },
    read_at: row.read_at ? row.read_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
  }
}

/** Получатели комментария: позднее правило перекрывает раннее, автор комментария исключается. */
function commentRecipients(comment: CommentCreatedV1): Map<string, CommentKind> {
  const kind_by_user_id = new Map<string, CommentKind>()
  for (const id of comment.subscriber_ids ?? []) kind_by_user_id.set(id, 'comment')
  kind_by_user_id.set(comment.article_author_id, 'comment')
  if (comment.parent_author_id && comment.parent_author_id !== comment.article_author_id)
    kind_by_user_id.set(comment.parent_author_id, 'reply')
  for (const id of comment.mention_ids ?? []) kind_by_user_id.set(id, 'mention')
  kind_by_user_id.delete(comment.author_id)
  return kind_by_user_id
}

export class NotificationService<TTx> {
  constructor(private readonly repository: NotificationRepositoryPort<TTx>) {}

  async list(viewer: ServiceContext, query: NotificationQuery): Promise<NotificationPage> {
    const user_id = requireUser(viewer)
    const cursor = query.cursor ? decodeNotificationCursor(query.cursor) : null
    const rows = await this.repository.list(user_id, cursor, query.limit + 1)
    const page = rows.slice(0, query.limit)
    const last = page.at(-1)
    return {
      items: page.map(toNotification),
      next_cursor: rows.length > query.limit && last ? encodeNotificationCursor({ t: last.created_at.toISOString(), id: last.id }) : null,
    }
  }

  async unreadCount(viewer: ServiceContext): Promise<UnreadCount> {
    return { count: await this.repository.unreadCount(requireUser(viewer)) }
  }

  async markRead(viewer: ServiceContext, id: string): Promise<Notification> {
    const row = await this.repository.markRead(requireUser(viewer), id)
    if (!row) throw new NotificationNotFoundError()
    return toNotification(row)
  }

  markAllRead(viewer: ServiceContext): Promise<void> {
    return this.repository.markAllRead(requireUser(viewer))
  }

  /** Копия статьи обновляется всегда; скрытие модератором дополнительно уведомляет автора. */
  async applyArticle(tx: TTx, source: NotificationSource, article: ArticleCopy, is_hidden: boolean): Promise<void> {
    await this.repository.upsertArticle(tx, article)
    if (!is_hidden) return
    await this.repository.notify(tx, {
      source,
      user_id: article.author_id,
      kind: 'moderation',
      article_id: article.article_id,
      actor_id: null,
    })
  }

  copyUser(tx: TTx, patch: UserCopy): Promise<void> {
    return this.repository.upsertUser(tx, patch)
  }

  async notifyComment(tx: TTx, source: NotificationSource, comment: CommentCreatedV1): Promise<void> {
    for (const [user_id, kind] of commentRecipients(comment)) {
      await this.repository.notify(tx, {
        source,
        user_id,
        kind,
        article_id: comment.article_id,
        comment_id: comment.comment_id,
        actor_id: comment.author_id,
      })
    }
  }

  /** Своя реакция и реакция на комментарий записей не создают. */
  async notifyReaction(tx: TTx, source: NotificationSource, reaction: ReactionAddedV1): Promise<void> {
    if (reaction.target_type !== 'article' || reaction.actor_id === reaction.target_author_id) return
    await this.repository.notify(tx, {
      source,
      user_id: reaction.target_author_id,
      kind: 'reaction',
      article_id: reaction.article_id,
      actor_id: reaction.actor_id,
    })
  }

  async notifyMessage(tx: TTx, source: NotificationSource, message: MessageSentV1): Promise<void> {
    if (message.sender_id === message.recipient_id) return
    await this.repository.notify(tx, {
      source,
      user_id: message.recipient_id,
      kind: 'message',
      conversation_id: message.conversation_id,
      actor_id: message.sender_id,
    })
  }
}

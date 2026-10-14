import { randomUUID } from 'node:crypto'
import { commentSchema } from '@blog/contracts'
import type { Comment, CommentReport, ReactionCounts, ReactionKind } from '@blog/contracts'
import { NotFoundError, ValidationError } from '@blog/errors'
import {
  CommentArticleNotFoundError,
  CommentNotFoundError,
  CommentParentInvalidError,
  CommentsDisabledError,
} from '../comment.errors.ts'
import { toExcerpt } from '../comment.excerpt.ts'
import { emptyCounts, toCommentNode } from '../comment.tree.ts'
import type { CommentStatus } from '../comment.tree.ts'
import type {
  ChangeCommentInput,
  CommentWriterPort,
  InsertCommentInput,
  ModerateCommentInput,
} from '../comment.types.ts'
import type {
  ArticleCountersPort,
  CommentEventsPort,
  CommentWriteRepositoryPort,
  LookupFile,
  ReviewReportInput,
  WriteComment,
} from './comment-write.types.ts'

const ANONYMOUS_NAME = 'Участник'

export class CommentWriteService<TTx> implements CommentWriterPort {
  constructor(
    private readonly repository: CommentWriteRepositoryPort<TTx>,
    private readonly counters: ArticleCountersPort<TTx>,
    private readonly events: CommentEventsPort<TTx>,
    private readonly lookup_file?: LookupFile,
  ) {}

  insert(input: InsertCommentInput): Promise<Comment> {
    return this.idempotent(input, async (tx) => {
      const article = await this.repository.findArticle(tx, input.article_id)
      if (!article) throw new CommentArticleNotFoundError()
      if (!article.comments_enabled) throw new CommentsDisabledError()

      let parent_author_id: string | null = null
      if (input.parent_id) {
        const parent = await this.repository.findComment(tx, input.parent_id)
        // Ответ только на корень этой статьи: вложенность глубже одного уровня в выдаче не показывается.
        if (!parent || parent.article_id !== input.article_id || parent.parent_id !== null)
          throw new CommentParentInvalidError()
        parent_author_id = parent.author_id
      }

      for (const file of input.media ?? []) {
        const parsed = new URL(file.url)
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
          throw new ValidationError({ message: 'Недопустимый адрес изображения' })
        const stored_file = await this.lookup_file?.(file.url)
        if (!stored_file || stored_file.uploader_id !== input.user_id || stored_file.kind !== 'image')
          throw new ValidationError({ message: 'Прикрепите загруженное вами изображение' })
      }
      const mention_ids = [...new Set((input.mentions ?? []).map((item) => item.user_id))]
      const should_notify_readers = article.status === 'published' && article.visibility !== 'author'
      if (!should_notify_readers && mention_ids.some((id) => id !== article.author_id))
        throw new ValidationError({ message: 'Участник не может читать закрытое обсуждение' })
      const mention_rows = mention_ids.length ? await this.repository.findActiveUsers(tx, mention_ids) : []
      if (mention_rows.length !== mention_ids.length)
        throw new ValidationError({ message: 'Участник для упоминания не найден' })
      const subscriber_ids = await this.repository.listSubscriberIds(
        tx,
        input.article_id,
        should_notify_readers ? null : article.author_id,
      )
      const comment_id = randomUUID()
      await this.repository.insertComment(tx, {
        id: comment_id,
        article_id: input.article_id,
        author_id: input.user_id,
        parent_id: input.parent_id ?? null,
        body: input.body,
        media: input.media ?? [],
        mentions: mention_rows.map((row) => ({ user_id: row.user_id, display_name: row.display_name ?? ANONYMOUS_NAME })),
      })
      if (input.parent_id) await this.repository.recountReplies(tx, input.parent_id)

      const snapshot = await this.counters.loadCounters(tx, input.article_id)
      await this.events.appendCreated(tx, {
        correlation_id: input.correlation_id,
        occurred_at: new Date().toISOString(),
        snapshot,
        comment_id,
        author_id: input.user_id,
        parent_id: input.parent_id ?? null,
        parent_author_id: should_notify_readers || parent_author_id === article.author_id ? parent_author_id : null,
        article_author_id: article.author_id,
        excerpt: toExcerpt(input.body),
        mention_ids,
        subscriber_ids,
      })
      return this.present(tx, comment_id, input.user_id)
    })
  }

  update(input: ChangeCommentInput & { body: string }): Promise<Comment> {
    return this.idempotent(input, async (tx) => {
      const row = await this.requireOwnVisible(tx, input.comment_id, input.user_id)
      const edited_at = new Date()
      await this.repository.updateBody(tx, row.id, input.body, edited_at)
      const occurred_at = edited_at.toISOString()
      const snapshot = await this.counters.loadCounters(tx, row.article_id)
      await this.events.appendUpdated(tx, {
        correlation_id: input.correlation_id,
        occurred_at,
        snapshot,
        comment_id: row.id,
        status: 'visible',
        edited_at: occurred_at,
      })
      return this.present(tx, row.id, input.user_id)
    })
  }

  remove(input: ChangeCommentInput): Promise<Comment> {
    return this.idempotent(input, async (tx) => {
      const row = await this.requireOwnVisible(tx, input.comment_id, input.user_id)
      await this.repository.setStatus(tx, row.id, 'deleted' satisfies CommentStatus)
      if (row.parent_id) await this.repository.recountReplies(tx, row.parent_id)
      const snapshot = await this.counters.loadCounters(tx, row.article_id)
      await this.events.appendUpdated(tx, {
        correlation_id: input.correlation_id,
        occurred_at: new Date().toISOString(),
        snapshot,
        comment_id: row.id,
        status: 'deleted',
        edited_at: row.edited_at ? row.edited_at.toISOString() : null,
      })
      return this.present(tx, row.id, input.user_id)
    })
  }

  moderate(input: ModerateCommentInput): Promise<Comment> {
    return this.repository.transaction((tx) => this.moderateIn(tx, input))
  }

  /** Повторный разбор жалобы ничего не меняет и возвращает уже разобранную жалобу. */
  reviewReport(input: ReviewReportInput): Promise<CommentReport> {
    return this.repository.transaction(async (tx) => {
      const row = await this.repository.lockReport(tx, input.id)
      if (!row) throw new NotFoundError()
      if (row.status !== 'reviewed') {
        if (input.action !== 'dismiss')
          await this.moderateIn(tx, {
            comment_id: row.comment_id,
            moderator_id: input.moderator_id,
            status: input.action === 'hide' ? 'hidden' : 'deleted',
            correlation_id: input.correlation_id,
          })
        await this.repository.markReportReviewed(tx, input.id, input.moderator_id, new Date())
      }
      return {
        id: row.id,
        comment_id: row.comment_id,
        reporter_id: row.reporter_id,
        reason: row.reason,
        status: 'reviewed' as const,
        created_at: row.created_at.toISOString(),
      }
    })
  }

  private async moderateIn(tx: TTx, input: ModerateCommentInput): Promise<Comment> {
    const row = await this.repository.lockComment(tx, input.comment_id)
    if (!row) throw new CommentNotFoundError()
    if (row.status !== input.status) {
      await this.repository.setStatus(tx, row.id, input.status)
      if (row.parent_id) await this.repository.recountReplies(tx, row.parent_id)
      const occurred_at = new Date().toISOString()
      const snapshot = await this.counters.loadCounters(tx, row.article_id)
      await this.events.appendUpdated(tx, {
        correlation_id: input.correlation_id,
        occurred_at,
        snapshot,
        comment_id: row.id,
        status: input.status,
        edited_at: row.edited_at ? row.edited_at.toISOString() : null,
      })
      if (input.status === 'hidden') {
        await this.events.appendHidden(tx, {
          correlation_id: input.correlation_id,
          occurred_at,
          comment_id: row.id,
          article_id: row.article_id,
          author_id: row.author_id,
          moderator_id: input.moderator_id,
        })
      }
    }
    return this.present(tx, row.id, input.moderator_id)
  }

  /** Повтор с тем же ключом возвращает сохранённый ответ и не пишет второй раз. */
  private idempotent(
    input: { user_id: string; idempotency_key: string | null },
    work: (tx: TTx) => Promise<Comment>,
  ): Promise<Comment> {
    const { user_id, idempotency_key } = input
    return this.repository.transaction(async (tx) => {
      if (idempotency_key) {
        await this.repository.lock(tx, `idem:${user_id}:${idempotency_key}`)
        const stored = await this.repository.findStoredResponse(tx, user_id, idempotency_key)
        if (stored !== null) return commentSchema.parse(stored)
      }
      const response = await work(tx)
      if (idempotency_key) await this.repository.saveResponse(tx, user_id, idempotency_key, response)
      return response
    })
  }

  private async requireOwnVisible(tx: TTx, comment_id: string, user_id: string): Promise<WriteComment> {
    const row = await this.repository.findComment(tx, comment_id)
    if (!row || row.author_id !== user_id || row.status !== 'visible') throw new CommentNotFoundError()
    return row
  }

  private async present(tx: TTx, comment_id: string, user_id: string): Promise<Comment> {
    const [row] = await this.repository.loadRows(tx, [comment_id])
    if (!row) throw new CommentNotFoundError()
    const ids = [row.id]
    const count_by_id = new Map<string, ReactionCounts>()
    for (const kind_row of await this.repository.countReactions(tx, ids)) {
      const counts = count_by_id.get(kind_row.target_id) ?? emptyCounts()
      counts[kind_row.kind] = kind_row.total
      count_by_id.set(kind_row.target_id, counts)
    }
    const mine_rows = await this.repository.findMine(tx, user_id, ids)
    const kind_by_id = new Map<string, ReactionKind>(mine_rows.map((item) => [item.target_id, item.kind]))
    return toCommentNode(row, count_by_id, kind_by_id, [])
  }
}

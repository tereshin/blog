import { randomUUID } from 'node:crypto'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { commentSchema } from '@blog/contracts'
import type { Comment } from '@blog/contracts'
import type { Database } from '@blog/broker'
import { ValidationError } from '@blog/errors'
import {
  articles_copy,
  discussion_subscriptions,
  comments,
  idempotency_keys,
  users_copy,
} from '../../infra/db/schema.ts'
import { loadArticleCounters } from '../article-snapshot/index.ts'
import {
  CommentArticleNotFoundError,
  CommentNotFoundError,
  CommentParentInvalidError,
  CommentsDisabledError,
} from './comment.errors.ts'
import { appendCommentCreated, appendCommentUpdated } from './comment.events.ts'
import { toExcerpt } from './comment.excerpt.ts'
import { recountReplies } from './comment.counts.ts'
import { present } from './comment.presentation.ts'
import { moderateComment } from './comment.moderate-write.ts'
import type { CommentStatus } from './comment.tree.ts'

type WriteBase = {
  user_id: string
  idempotency_key: string | null
  correlation_id: string
}

export type InsertCommentInput = WriteBase & {
  article_id: string
  body: string
  media?: { url: string; alt: string }[] | undefined
  mentions?: { user_id: string; display_name: string }[] | undefined
  parent_id?: string | undefined
}

export type ChangeCommentInput = WriteBase & {
  comment_id: string
  body?: string
}

async function lock(tx: Database, key: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`)
}

async function replay(tx: Database, user_id: string, key: string | null): Promise<Comment | null> {
  if (!key) return null
  await lock(tx, `idem:${user_id}:${key}`)
  const [stored] = await tx
    .select({ response: idempotency_keys.response })
    .from(idempotency_keys)
    .where(and(eq(idempotency_keys.user_id, user_id), eq(idempotency_keys.key, key)))
    .limit(1)
  return stored ? commentSchema.parse(stored.response) : null
}

async function remember(
  tx: Database,
  user_id: string,
  key: string | null,
  response: Comment,
): Promise<Comment> {
  if (key) await tx.insert(idempotency_keys).values({ user_id, key, response })
  return response
}

async function requireOwnVisible(tx: Database, comment_id: string, user_id: string) {
  const [row] = await tx.select().from(comments).where(eq(comments.id, comment_id)).limit(1)
  if (!row || row.author_id !== user_id || row.status !== 'visible')
    throw new CommentNotFoundError()
  return row
}

export function createCommentWriter(
  db: NodePgDatabase,
  lookup_file?: (url: string) => Promise<{ uploader_id: string; kind: string } | null>,
) {
  return {
    async insert(input: InsertCommentInput): Promise<Comment> {
      return db.transaction(async (tx) => {
        const database = tx as Database
        const stored = await replay(database, input.user_id, input.idempotency_key)
        if (stored) return stored

        const [article] = await database
          .select()
          .from(articles_copy)
          .where(eq(articles_copy.article_id, input.article_id))
          .limit(1)
        if (!article) throw new CommentArticleNotFoundError()
        if (!article.comments_enabled) throw new CommentsDisabledError()

        let parent_author_id: string | null = null
        if (input.parent_id) {
          const [parent] = await database
            .select()
            .from(comments)
            .where(eq(comments.id, input.parent_id))
            .limit(1)
          // Ответ только на корень этой статьи: вложенность глубже одного уровня в выдаче не показывается.
          if (!parent || parent.article_id !== input.article_id || parent.parent_id !== null)
            throw new CommentParentInvalidError()
          parent_author_id = parent.author_id
        }

        for (const file of input.media ?? []) {
          const parsed = new URL(file.url)
          if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
            throw new ValidationError({ message: 'Недопустимый адрес изображения' })
          const stored_file = await lookup_file?.(file.url)
          if (
            !stored_file ||
            stored_file.uploader_id !== input.user_id ||
            stored_file.kind !== 'image'
          )
            throw new ValidationError({ message: 'Прикрепите загруженное вами изображение' })
        }
        const mention_ids = [...new Set((input.mentions ?? []).map((item) => item.user_id))]
        if (article.visibility === 'author' && mention_ids.some((id) => id !== article.author_id))
          throw new ValidationError({ message: 'Участник не может читать закрытое обсуждение' })
        const mention_rows = mention_ids.length
          ? await database
              .select({ user_id: users_copy.user_id, display_name: users_copy.display_name })
              .from(users_copy)
              .where(
                and(inArray(users_copy.user_id, mention_ids), eq(users_copy.is_restricted, false)),
              )
          : []
        if (mention_rows.length !== mention_ids.length)
          throw new ValidationError({ message: 'Участник для упоминания не найден' })
        const subscribers = await database
          .select({ user_id: discussion_subscriptions.user_id })
          .from(discussion_subscriptions)
          .innerJoin(users_copy, eq(users_copy.user_id, discussion_subscriptions.user_id))
          .where(
            and(
              eq(discussion_subscriptions.article_id, input.article_id),
              eq(users_copy.is_restricted, false),
              article.visibility === 'author'
                ? eq(discussion_subscriptions.user_id, article.author_id)
                : undefined,
            ),
          )
        const comment_id = randomUUID()
        await database.insert(comments).values({
          id: comment_id,
          article_id: input.article_id,
          author_id: input.user_id,
          parent_id: input.parent_id ?? null,
          body: input.body,
          media: input.media ?? [],
          mentions: mention_rows.map((row) => ({
            user_id: row.user_id,
            display_name: row.display_name ?? 'Участник',
          })),
          status: 'visible',
        })
        if (input.parent_id) await recountReplies(database, input.parent_id)

        const occurred_at = new Date().toISOString()
        const snapshot = await loadArticleCounters(database, input.article_id)
        await appendCommentCreated(database, {
          correlation_id: input.correlation_id,
          occurred_at,
          snapshot,
          comment_id,
          author_id: input.user_id,
          parent_id: input.parent_id ?? null,
          parent_author_id,
          article_author_id: article.author_id,
          excerpt: toExcerpt(input.body),
          mention_ids,
          subscriber_ids: subscribers.map((row) => row.user_id),
        })
        return remember(
          database,
          input.user_id,
          input.idempotency_key,
          await present(database, comment_id, input.user_id),
        )
      })
    },

    async update(input: ChangeCommentInput & { body: string }): Promise<Comment> {
      return db.transaction(async (tx) => {
        const database = tx as Database
        const stored = await replay(database, input.user_id, input.idempotency_key)
        if (stored) return stored
        const row = await requireOwnVisible(database, input.comment_id, input.user_id)
        const edited_at = new Date()
        await database
          .update(comments)
          .set({ body: input.body, edited_at })
          .where(eq(comments.id, row.id))
        const occurred_at = edited_at.toISOString()
        const snapshot = await loadArticleCounters(database, row.article_id)
        await appendCommentUpdated(database, {
          correlation_id: input.correlation_id,
          occurred_at,
          snapshot,
          comment_id: row.id,
          status: 'visible',
          edited_at: occurred_at,
        })
        return remember(
          database,
          input.user_id,
          input.idempotency_key,
          await present(database, row.id, input.user_id),
        )
      })
    },

    async remove(input: ChangeCommentInput): Promise<Comment> {
      return db.transaction(async (tx) => {
        const database = tx as Database
        const stored = await replay(database, input.user_id, input.idempotency_key)
        if (stored) return stored
        const row = await requireOwnVisible(database, input.comment_id, input.user_id)
        await database
          .update(comments)
          .set({ status: 'deleted' satisfies CommentStatus })
          .where(eq(comments.id, row.id))
        if (row.parent_id) await recountReplies(database, row.parent_id)
        const snapshot = await loadArticleCounters(database, row.article_id)
        await appendCommentUpdated(database, {
          correlation_id: input.correlation_id,
          occurred_at: new Date().toISOString(),
          snapshot,
          comment_id: row.id,
          status: 'deleted',
          edited_at: row.edited_at ? row.edited_at.toISOString() : null,
        })
        return remember(
          database,
          input.user_id,
          input.idempotency_key,
          await present(database, row.id, input.user_id),
        )
      })
    },

    async moderate(input: {
      comment_id: string
      status: CommentStatus
      correlation_id: string
      moderator_id: string
    }): Promise<Comment> {
      return db.transaction(async (tx) => {
        const database = tx as Database
        return moderateComment(database, input)
      })
    },
  }
}

export type CommentWriter = ReturnType<typeof createCommentWriter>

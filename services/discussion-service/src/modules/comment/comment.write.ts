import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { commentSchema } from '@blog/contracts'
import type { Comment, ReactionCounts, ReactionKind } from '@blog/contracts'
import { REACTION_KINDS } from '@blog/contracts'
import type { Database } from '@blog/broker'
import { articles_copy, comments, idempotency_keys, reactions, users_copy } from '../../infra/db/schema.ts'
import { loadArticleCounters } from '../article-snapshot/index.ts'
import { CommentArticleNotFoundError, CommentNotFoundError, CommentParentInvalidError, CommentsDisabledError } from './comment.errors.ts'
import { appendCommentCreated, appendCommentUpdated } from './comment.events.ts'
import { toExcerpt } from './comment.excerpt.ts'
import { emptyCounts, occupiesThread, toCommentNode, toReplyNode } from './comment.tree.ts'
import type { CommentRow, CommentStatus } from './comment.tree.ts'

type WriteBase = {
  user_id: string
  idempotency_key: string | null
  correlation_id: string
}

export type InsertCommentInput = WriteBase & {
  article_id: string
  body: string
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

async function remember(tx: Database, user_id: string, key: string | null, response: Comment): Promise<Comment> {
  if (key) await tx.insert(idempotency_keys).values({ user_id, key, response })
  return response
}

async function recountReplies(tx: Database, parent_id: string): Promise<void> {
  await tx
    .update(comments)
    .set({
      reply_count: sql<number>`(
        select count(*)::int from comments as child
        where child.parent_id = ${parent_id}::uuid
          and (child.status = 'visible' or child.reply_count > 0)
      )`,
    })
    .where(eq(comments.id, parent_id))
}

async function loadRows(tx: Database, ids: readonly string[]): Promise<CommentRow[]> {
  if (ids.length === 0) return []
  return tx
    .select({
      id: comments.id,
      author_id: comments.author_id,
      parent_id: comments.parent_id,
      body: comments.body,
      status: comments.status,
      edited_at: comments.edited_at,
      reaction_count: comments.reaction_count,
      reply_count: comments.reply_count,
      created_at: comments.created_at,
      author_name: users_copy.display_name,
      author_avatar_url: users_copy.avatar_url,
    })
    .from(comments)
    .leftJoin(users_copy, eq(users_copy.user_id, comments.author_id))
    .where(inArray(comments.id, [...ids]))
    .orderBy(asc(comments.created_at), asc(comments.id))
}

async function present(tx: Database, comment_id: string, user_id: string): Promise<Comment> {
  const [row] = await loadRows(tx, [comment_id])
  if (!row) throw new CommentNotFoundError()
  const reply_rows = row.parent_id
    ? []
    : (
        await tx
          .select({ id: comments.id })
          .from(comments)
          .where(eq(comments.parent_id, row.id))
          .orderBy(asc(comments.created_at), asc(comments.id))
      ).map((item) => item.id)
  const replies = (await loadRows(tx, reply_rows)).filter(occupiesThread)
  const ids = [row.id, ...replies.map((item) => item.id)]
  const kind_rows = await tx
    .select({ target_id: reactions.target_id, kind: reactions.kind, total: sql<number>`count(*)::int` })
    .from(reactions)
    .where(and(eq(reactions.target_type, 'comment'), inArray(reactions.target_id, ids)))
    .groupBy(reactions.target_id, reactions.kind)
  const facts = new Map<string, ReactionCounts>()
  for (const kind_row of kind_rows) {
    const counts = facts.get(kind_row.target_id) ?? emptyCounts()
    if (REACTION_KINDS.includes(kind_row.kind)) counts[kind_row.kind] = Number(kind_row.total)
    facts.set(kind_row.target_id, counts)
  }
  const mine_rows = await tx
    .select({ target_id: reactions.target_id, kind: reactions.kind })
    .from(reactions)
    .where(and(eq(reactions.user_id, user_id), eq(reactions.target_type, 'comment'), inArray(reactions.target_id, ids)))
  const mine = new Map<string, ReactionKind>(mine_rows.map((item) => [item.target_id, item.kind]))
  return toCommentNode(
    row,
    facts,
    mine,
    replies.map((reply) => toReplyNode(reply, facts, mine)),
  )
}

async function requireOwnVisible(tx: Database, comment_id: string, user_id: string) {
  const [row] = await tx.select().from(comments).where(eq(comments.id, comment_id)).limit(1)
  if (!row || row.author_id !== user_id || row.status !== 'visible') throw new CommentNotFoundError()
  return row
}

export function createCommentWriter(db: NodePgDatabase) {
  return {
    async insert(input: InsertCommentInput): Promise<Comment> {
      return db.transaction(async (tx) => {
        const database = tx as Database
        const stored = await replay(database, input.user_id, input.idempotency_key)
        if (stored) return stored

        const [article] = await database.select().from(articles_copy).where(eq(articles_copy.article_id, input.article_id)).limit(1)
        if (!article) throw new CommentArticleNotFoundError()
        if (!article.comments_enabled) throw new CommentsDisabledError()

        let parent_author_id: string | null = null
        if (input.parent_id) {
          const [parent] = await database.select().from(comments).where(eq(comments.id, input.parent_id)).limit(1)
          // Ответ только на корень этой статьи: вложенность глубже одного уровня в выдаче не показывается.
          if (!parent || parent.article_id !== input.article_id || parent.parent_id !== null) throw new CommentParentInvalidError()
          parent_author_id = parent.author_id
        }

        const comment_id = randomUUID()
        await database.insert(comments).values({
          id: comment_id,
          article_id: input.article_id,
          author_id: input.user_id,
          parent_id: input.parent_id ?? null,
          body: input.body,
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
        })
        return remember(database, input.user_id, input.idempotency_key, await present(database, comment_id, input.user_id))
      })
    },

    async update(input: ChangeCommentInput & { body: string }): Promise<Comment> {
      return db.transaction(async (tx) => {
        const database = tx as Database
        const stored = await replay(database, input.user_id, input.idempotency_key)
        if (stored) return stored
        const row = await requireOwnVisible(database, input.comment_id, input.user_id)
        const edited_at = new Date()
        await database.update(comments).set({ body: input.body, edited_at }).where(eq(comments.id, row.id))
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
        return remember(database, input.user_id, input.idempotency_key, await present(database, row.id, input.user_id))
      })
    },

    async remove(input: ChangeCommentInput): Promise<Comment> {
      return db.transaction(async (tx) => {
        const database = tx as Database
        const stored = await replay(database, input.user_id, input.idempotency_key)
        if (stored) return stored
        const row = await requireOwnVisible(database, input.comment_id, input.user_id)
        await database.update(comments).set({ status: 'deleted' satisfies CommentStatus }).where(eq(comments.id, row.id))
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
        return remember(database, input.user_id, input.idempotency_key, await present(database, row.id, input.user_id))
      })
    },
  }
}

export type CommentWriter = ReturnType<typeof createCommentWriter>

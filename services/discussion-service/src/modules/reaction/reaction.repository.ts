import { and, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ReactionCounts, ReactionKind } from '@blog/contracts'
import type { Database } from '@blog/broker'
import { advisoryLock, findIdempotentResponse, saveIdempotentResponse } from '../../infra/db/idempotency.ts'
import { articles_copy, comments, reactions } from '../../infra/db/schema.ts'
import type { ReactionKey, ReactionRepositoryPort, ReactionTarget, ReactionTargetType } from './reaction.types.ts'

function byKey(key: ReactionKey) {
  return and(eq(reactions.user_id, key.user_id), eq(reactions.target_type, key.target_type), eq(reactions.target_id, key.target_id))
}

export class ReactionRepository implements ReactionRepositoryPort<Database> {
  constructor(private readonly db: NodePgDatabase) {}

  async findTarget(target_type: ReactionTargetType, target_id: string): Promise<ReactionTarget | null> {
    if (target_type === 'article') {
      const [row] = await this.db
        .select({
          article_id: articles_copy.article_id,
          author_id: articles_copy.author_id,
          visibility: articles_copy.visibility,
          status: articles_copy.status,
        })
        .from(articles_copy)
        .where(eq(articles_copy.article_id, target_id))
        .limit(1)
      if (!row) return null
      return {
        target_type: 'article',
        target_id,
        article_id: row.article_id,
        author_id: row.author_id,
        access: { author_id: row.author_id, visibility: row.visibility, status: row.status },
        comment_status: null,
      }
    }

    const [row] = await this.db
      .select({
        comment_id: comments.id,
        comment_author_id: comments.author_id,
        comment_status: comments.status,
        article_id: articles_copy.article_id,
        author_id: articles_copy.author_id,
        visibility: articles_copy.visibility,
        status: articles_copy.status,
      })
      .from(comments)
      .innerJoin(articles_copy, eq(articles_copy.article_id, comments.article_id))
      .where(eq(comments.id, target_id))
      .limit(1)
    if (!row) return null
    return {
      target_type: 'comment',
      target_id: row.comment_id,
      article_id: row.article_id,
      author_id: row.comment_author_id,
      access: { author_id: row.author_id, visibility: row.visibility, status: row.status },
      comment_status: row.comment_status,
    }
  }

  transaction<TResult>(work: (tx: Database) => Promise<TResult>): Promise<TResult> {
    return this.db.transaction((tx) => work(tx))
  }

  lock(tx: Database, key: string): Promise<void> {
    return advisoryLock(tx, key)
  }

  findStoredResponse(tx: Database, user_id: string, idempotency_key: string): Promise<unknown> {
    return findIdempotentResponse(tx, user_id, idempotency_key)
  }

  saveResponse(tx: Database, user_id: string, idempotency_key: string, response: unknown): Promise<void> {
    return saveIdempotentResponse(tx, user_id, idempotency_key, response)
  }

  async findKind(tx: Database, key: ReactionKey): Promise<ReactionKind | null> {
    const [row] = await tx.select({ kind: reactions.kind }).from(reactions).where(byKey(key)).limit(1)
    return row?.kind ?? null
  }

  async insertReaction(tx: Database, key: ReactionKey, kind: ReactionKind): Promise<void> {
    await tx.insert(reactions).values({ ...key, kind })
  }

  async updateKind(tx: Database, key: ReactionKey, kind: ReactionKind): Promise<void> {
    await tx.update(reactions).set({ kind }).where(byKey(key))
  }

  async deleteReaction(tx: Database, key: ReactionKey): Promise<void> {
    await tx.delete(reactions).where(byKey(key))
  }

  async countKinds(tx: Database, target_type: ReactionTargetType, target_id: string): Promise<ReactionCounts> {
    const rows = await tx
      .select({ kind: reactions.kind, total: sql<number>`count(*)::int` })
      .from(reactions)
      .where(and(eq(reactions.target_type, target_type), eq(reactions.target_id, target_id)))
      .groupBy(reactions.kind)
    const counts: ReactionCounts = {}
    for (const row of rows) counts[row.kind] = Number(row.total)
    return counts
  }

  async setCommentReactionCount(tx: Database, comment_id: string, reaction_count: number): Promise<void> {
    await tx.update(comments).set({ reaction_count }).where(eq(comments.id, comment_id))
  }
}

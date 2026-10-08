import { and, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { reactionResponseSchema } from '@blog/contracts'
import type { ReactionCounts, ReactionKind, ReactionResponse } from '@blog/contracts'
import { REACTION_KINDS } from '@blog/contracts'
import type { Database } from '@blog/broker'
import { articles_copy, comments, idempotency_keys, reactions } from '../../infra/db/schema.ts'
import { loadArticleCounters } from '../article-snapshot/index.ts'
import { recomputeReputation } from '../reputation/index.ts'
import { appendReactionEvents } from './reaction.events.ts'
import { applyOne } from './reaction.rules.ts'
import type { CommitReaction, ReactionRepository, ReactionTarget } from './reaction.types.ts'

function emptyCounts(): ReactionCounts {
  return { laugh: 0, heart: 0, thumb: 0, fire: 0 }
}

async function lock(tx: Database, key: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`)
}

async function countKinds(tx: Database, target_type: 'article' | 'comment', target_id: string): Promise<ReactionCounts> {
  const rows = await tx
    .select({ kind: reactions.kind, total: sql<number>`count(*)::int` })
    .from(reactions)
    .where(and(eq(reactions.target_type, target_type), eq(reactions.target_id, target_id)))
    .groupBy(reactions.kind)
  const counts = emptyCounts()
  for (const row of rows) {
    if ((REACTION_KINDS as readonly string[]).includes(row.kind)) counts[row.kind] = Number(row.total)
  }
  return counts
}

export function createReactionRepository(db: NodePgDatabase): ReactionRepository {
  return {
    async findTarget(target_type, target_id) {
      if (target_type === 'article') {
        const [row] = await db
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
        const target: ReactionTarget = {
          target_type: 'article',
          target_id,
          article_id: row.article_id,
          author_id: row.author_id,
          access: { author_id: row.author_id, visibility: row.visibility, status: row.status },
          comment_status: null,
        }
        return target
      }

      const [row] = await db
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
    },

    async commit(input: CommitReaction) {
      return db.transaction(async (tx) => {
        const database = tx as Database
        if (input.idempotency_key) {
          await lock(database, `idem:${input.user_id}:${input.idempotency_key}`)
          const [stored] = await database
            .select({ response: idempotency_keys.response })
            .from(idempotency_keys)
            .where(and(eq(idempotency_keys.user_id, input.user_id), eq(idempotency_keys.key, input.idempotency_key)))
            .limit(1)
          if (stored) return reactionResponseSchema.parse(stored.response)
        }

        await lock(database, `react:${input.user_id}:${input.target.target_type}:${input.target.target_id}`)
        const [current_row] = await database
          .select({ kind: reactions.kind })
          .from(reactions)
          .where(
            and(
              eq(reactions.user_id, input.user_id),
              eq(reactions.target_type, input.target.target_type),
              eq(reactions.target_id, input.target.target_id),
            ),
          )
          .limit(1)
        const decision = applyOne(current_row?.kind ?? null, input.kind)
        if (decision.next === null) {
          await database
            .delete(reactions)
            .where(
              and(
                eq(reactions.user_id, input.user_id),
                eq(reactions.target_type, input.target.target_type),
                eq(reactions.target_id, input.target.target_id),
              ),
            )
        } else if (current_row) {
          await database
            .update(reactions)
            .set({ kind: decision.next })
            .where(
              and(
                eq(reactions.user_id, input.user_id),
                eq(reactions.target_type, input.target.target_type),
                eq(reactions.target_id, input.target.target_id),
              ),
            )
        } else {
          await database.insert(reactions).values({
            user_id: input.user_id,
            target_type: input.target.target_type,
            target_id: input.target.target_id,
            kind: decision.next,
          })
        }

        const reaction_counts = await countKinds(database, input.target.target_type, input.target.target_id)
        const reaction_count = REACTION_KINDS.reduce((sum, kind) => sum + reaction_counts[kind], 0)
        if (input.target.target_type === 'comment') {
          await database.update(comments).set({ reaction_count }).where(eq(comments.id, input.target.target_id))
        }

        const snapshot = await loadArticleCounters(database, input.target.article_id)
        const reputation = await recomputeReputation(database, input.target.author_id)
        await appendReactionEvents(database, {
          correlation_id: input.correlation_id,
          occurred_at: new Date().toISOString(),
          snapshot,
          placed: decision.placed,
          target_type: input.target.target_type,
          target_id: input.target.target_id,
          article_id: input.target.article_id,
          actor_id: input.user_id,
          target_author_id: input.target.author_id,
          kind: input.kind,
          reputation,
        })

        const response: ReactionResponse =
          input.target.target_type === 'article'
            ? { reaction_counts: snapshot.reaction_counts, reaction_count: snapshot.reaction_count, my_reaction: decision.next }
            : { reaction_counts, reaction_count, my_reaction: decision.next }

        if (input.idempotency_key) {
          await database.insert(idempotency_keys).values({
            user_id: input.user_id,
            key: input.idempotency_key,
            response,
          })
        }
        return response
      })
    },
  }
}

export type { ReactionKind }

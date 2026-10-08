import { sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'

export type ReputationFact = { target_type: 'article' | 'comment'; status: string }

/** Репутация — число реакций на опубликованные статьи и видимые комментарии человека. */
export function reputationOf(facts: readonly ReputationFact[]): number {
  return facts.filter((fact) => (fact.target_type === 'article' ? fact.status === 'published' : fact.status === 'visible')).length
}

export type ReputationRepository = {
  listFacts: (tx: Database, user_id: string) => Promise<ReputationFact[]>
}

export function createReputationRepository(): ReputationRepository {
  return {
    async listFacts(tx, user_id) {
      const result = await tx.execute<{ target_type: 'article' | 'comment'; status: string }>(sql`
        select 'article'::text as target_type, a.status::text as status
        from reactions r
        join articles_copy a on r.target_type = 'article' and r.target_id = a.article_id
        where a.author_id = ${user_id}::uuid
        union all
        select 'comment'::text as target_type, c.status::text as status
        from reactions r
        join comments c on r.target_type = 'comment' and r.target_id = c.id
        where c.author_id = ${user_id}::uuid
      `)
      const rows = 'rows' in result ? result.rows : result
      return [...rows]
    },
  }
}

import type { Database } from '@blog/broker'
import { createReputationRepository, reputationOf } from './reputation.repository.ts'
import type { ReputationRepository } from './reputation.repository.ts'

/** Пересчёт репутации внутри транзакции, которая изменила реакции. */
export async function recomputeReputation(tx: Database, user_id: string, repository: ReputationRepository = createReputationRepository()): Promise<number> {
  return reputationOf(await repository.listFacts(tx, user_id))
}

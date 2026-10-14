import type { ReputationFact, ReputationRepositoryPort } from './reputation.types.ts'

export class ReputationService<TTx> {
  constructor(private readonly repository: ReputationRepositoryPort<TTx>) {}

  /** Репутация — число реакций на опубликованные статьи и видимые комментарии человека. */
  reputationOf(facts: readonly ReputationFact[]): number {
    return facts.filter((fact) => (fact.target_type === 'article' ? fact.status === 'published' : fact.status === 'visible')).length
  }

  /** Пересчёт репутации внутри транзакции, которая изменила реакции. */
  async recompute(tx: TTx, user_id: string): Promise<number> {
    return this.reputationOf(await this.repository.listFacts(tx, user_id))
  }
}

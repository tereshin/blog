export type ReputationFact = { target_type: 'article' | 'comment'; status: string }

/** Факты читаются в транзакции, которая только что изменила реакции. */
export type ReputationRepositoryPort<TTx> = {
  listFacts: (tx: TTx, user_id: string) => Promise<ReputationFact[]>
}

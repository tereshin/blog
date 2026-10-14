import type { BadgeService } from '../badge/index.ts'
import type { CountersRepository } from './counters.types.ts'

export function createCountersService(
  repository: CountersRepository,
  badges: Pick<BadgeService, 'evaluate'>,
) {
  return {
    applyArticle: repository.applyArticle,
    async applyReputation(event: Parameters<CountersRepository['applyReputation']>[0]) {
      await repository.applyReputation(event)
      await badges.evaluate(event.user_id)
    },
  }
}

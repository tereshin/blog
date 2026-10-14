import type { Database } from '@blog/broker'
import { SocialCoverConsumer } from './social-cover.consumer.ts'
import type { SocialCoverConsumerDeps } from './social-cover.consumer.ts'
import { SocialCoverRepository } from './social-cover.repository.ts'
import { SocialCoverService } from './social-cover.service.ts'

export { SocialCoverService, coverRevision } from './social-cover.service.ts'
export { SocialCoverRepository } from './social-cover.repository.ts'
export { SocialCoverConsumer } from './social-cover.consumer.ts'
export type { SocialCoverConsumerDeps } from './social-cover.consumer.ts'
export type { SocialCoverRepositoryPort } from './social-cover.types.ts'

function covers() {
  return new SocialCoverService(new SocialCoverRepository())
}

export function requestSiteCover(tx: Database, correlation_id: string) {
  return covers().requestSiteCover(tx, correlation_id)
}

export function requestArticleCover(tx: Database, article_id: string, correlation_id: string) {
  return covers().requestArticleCover(tx, article_id, correlation_id)
}

export function requestAuthorCovers(tx: Database, author_id: string, correlation_id: string) {
  return covers().requestAuthorCovers(tx, author_id, correlation_id)
}

export function applyGeneratedCover(tx: Database, event: unknown) {
  return covers().applyGenerated(tx, event)
}

export function startSocialCoverConsumer(deps: SocialCoverConsumerDeps) {
  return new SocialCoverConsumer(covers()).start(deps)
}

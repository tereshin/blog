import { createIdempotentConsumer } from '@blog/broker'
import type { Database, BrokerClient } from '@blog/broker'
import { FeedbackAcceptedV1 } from '@blog/contracts'
import type { Logger } from '@blog/logger'
import { feedback_mail_jobs } from '../../infra/db/schema.ts'
export { FeedbackMailWorker } from './feedback-mail.worker.ts'
export async function startFeedbackConsumer(deps: {
  db: Database
  broker: BrokerClient
  logger: Logger
}) {
  return createIdempotentConsumer({
    ...deps,
    durable: 'notification-feedback',
    subject: 'content.feedback.accepted',
    handler: async (tx, event) => {
      const input = FeedbackAcceptedV1.parse(event)
      await tx
        .insert(feedback_mail_jobs)
        .values({
          id: input.submission_id,
          token: input.delivery_token,
          expires_at: new Date(new Date(input.occurred_at).getTime() + 86400000),
        })
        .onConflictDoNothing()
    },
  })
}

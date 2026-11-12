import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { and, eq, lt, sql } from 'drizzle-orm'
import { appendToOutbox, type Database } from '@blog/broker'
import {
  FeedbackAcceptedV1,
  feedbackDeliverySchema,
  type FeedbackSubmission,
} from '@blog/contracts'
import { AppError } from '@blog/errors'
import { feedback_delivery, feedback_submissions } from '../../infra/db/schema.ts'
import type { z } from 'zod'
const digest = (value: string) => createHash('sha256').update(value).digest('hex')
export type ClaimFiles = (input: {
  token: string
  submission_id: string
  attachment_ids: string[]
}) => Promise<void>
export class FeedbackRepository {
  constructor(private readonly db: Database) {}
  async accept(
    input: FeedbackSubmission,
    key: string,
    correlation_id: string,
    payload: z.infer<typeof feedbackDeliverySchema>,
    claim: ClaimFiles,
  ) {
    const fingerprint = digest(JSON.stringify(input))
    const operation_key = digest(input.upload_token + ':' + key)
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${operation_key}, 0))`)
      const [existing] = await tx
        .select()
        .from(feedback_submissions)
        .where(eq(feedback_submissions.key, operation_key))
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw new AppError({
            code: 'idempotency_key_conflict',
            http_status: 409,
            message: 'Idempotency conflict',
          })
        return { submission_id: existing.id }
      }
      const raw_id = digest(operation_key)
      const id =
        raw_id.slice(0, 8) +
        '-' +
        raw_id.slice(8, 12) +
        '-4' +
        raw_id.slice(13, 16) +
        '-a' +
        raw_id.slice(17, 20) +
        '-' +
        raw_id.slice(20, 32)
      if (input.attachment_ids.length)
        await claim({
          token: input.upload_token,
          submission_id: id,
          attachment_ids: input.attachment_ids,
        })
      const token = randomBytes(32).toString('hex')
      await tx.insert(feedback_submissions).values({ id, key: operation_key, fingerprint })
      await tx.insert(feedback_delivery).values({
        id,
        token_hash: digest(token),
        payload,
        expires_at: new Date(Date.now() + 86400000),
      })
      await appendToOutbox(
        tx,
        FeedbackAcceptedV1.parse({
          event_id: randomUUID(),
          name: 'content.feedback.accepted',
          occurred_at: new Date().toISOString(),
          correlation_id,
          causation_id: null,
          version: 1,
          submission_id: id,
          delivery_token: token,
        }),
      )
      return { submission_id: id }
    })
  }
  async delivery(id: string, token: string) {
    const [row] = await this.db
      .select()
      .from(feedback_delivery)
      .where(and(eq(feedback_delivery.id, id), eq(feedback_delivery.token_hash, digest(token))))
    if (!row || row.expires_at < new Date()) return null
    return feedbackDeliverySchema.parse(row.payload)
  }
  async remove(id: string, token: string) {
    await this.db
      .delete(feedback_delivery)
      .where(and(eq(feedback_delivery.id, id), eq(feedback_delivery.token_hash, digest(token))))
  }
  async cleanup() {
    await this.db.delete(feedback_delivery).where(lt(feedback_delivery.expires_at, new Date()))
    await this.db
      .delete(feedback_submissions)
      .where(lt(feedback_submissions.created_at, new Date(Date.now() - 7 * 86400000)))
  }
}

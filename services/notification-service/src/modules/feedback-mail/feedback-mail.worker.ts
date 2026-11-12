import nodemailer from 'nodemailer'
import { eq, lte } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import type { ServiceClient } from '@blog/http-kit'
import type { Logger } from '@blog/logger'
import { feedbackDeliverySchema, feedbackFilesSchema } from '@blog/contracts'
import { feedback_mail_jobs } from '../../infra/db/schema.ts'
import type { Env } from '../../config/env.ts'
export class FeedbackMailWorker {
  private timer: NodeJS.Timeout | undefined
  private running: Promise<unknown> | undefined
  private stopped = true
  private readonly transport
  constructor(
    private readonly options: {
      db: Database
      content: ServiceClient
      media: ServiceClient
      env: Env
      logger: Pick<Logger, 'warn'>
    },
  ) {
    const { env } = options
    this.transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      requireTLS: env.APP_ENV === 'prod',
      ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}),
      connectionTimeout: 3000,
      greetingTimeout: 3000,
      socketTimeout: 15000,
      logger: false,
      debug: false,
    })
  }
  start() {
    this.stopped = false
    this.schedule()
  }
  async stop() {
    this.stopped = true
    clearTimeout(this.timer)
    await this.running
    this.transport.close()
  }
  async flushOnce() {
    const { db, content, media, env, logger } = this.options
    return db.transaction(async (tx) => {
      const jobs = await tx
        .select()
        .from(feedback_mail_jobs)
        .where(lte(feedback_mail_jobs.available_at, new Date()))
        .orderBy(feedback_mail_jobs.available_at)
        .limit(1)
        .for('update', { skipLocked: true })
      for (const job of jobs) {
        const capability = { submission_id: job.id, token: job.token }
        try {
          const result = await content.request({
            method: 'POST',
            path: '/internal/feedback/read',
            body: capability,
            idempotency_key: job.id,
          })
          if (result.status === 404) {
            await tx.delete(feedback_mail_jobs).where(eq(feedback_mail_jobs.id, job.id))
            continue
          }
          if (result.status !== 200) throw new Error('Delivery unavailable')
          const payload = feedbackDeliverySchema.parse(result.body)
          const files_capability = { submission_id: job.id, token: payload.upload_token }
          if (job.status === 'pending' && job.expires_at > new Date() && job.attempts < 3) {
            const files = payload.attachment_ids.length
              ? await media.request({
                  method: 'POST',
                  path: '/internal/feedback-files/read',
                  body: files_capability,
                  idempotency_key: job.id,
                })
              : { status: 200, body: [] }
            if (files.status !== 200) throw new Error('Files unavailable')
            const attachments = feedbackFilesSchema
              .parse(files.body)
              .filter((file) => payload.attachment_ids.includes(file.id))
            if (attachments.length !== payload.attachment_ids.length)
              throw new Error('Missing attachment')
            await this.transport.sendMail({
              from: env.SMTP_FROM,
              to: payload.recipient,
              ...(payload.reply_to ? { replyTo: payload.reply_to } : {}),
              messageId: '<feedback-' + job.id + '@blog>',
              subject: 'Feedback',
              text: payload.text,
              headers: { 'X-Auto-Response-Suppress': 'All' },
              attachments: attachments.map((file) => ({
                filename: file.name,
                content: Buffer.from(file.content, 'base64'),
                contentType: file.mime,
              })),
            })
            // Persist delivered before cleanup: cleanup failures must not resend the message.
            await tx
              .update(feedback_mail_jobs)
              .set({ status: 'delivered' })
              .where(eq(feedback_mail_jobs.id, job.id))
            continue
          }
          const cleaned = payload.attachment_ids.length
            ? await media.request({
                method: 'POST',
                path: '/internal/feedback-files/complete',
                body: files_capability,
                idempotency_key: job.id,
              })
            : { status: 204 }
          if (cleaned.status !== 204) {
            await tx
              .update(feedback_mail_jobs)
              .set({ available_at: new Date(Date.now() + 10000) })
              .where(eq(feedback_mail_jobs.id, job.id))
            continue
          }
          const completed = await content.request({
            method: 'POST',
            path: '/internal/feedback/complete',
            body: capability,
            idempotency_key: job.id,
          })
          if (completed.status !== 204) {
            await tx
              .update(feedback_mail_jobs)
              .set({ available_at: new Date(Date.now() + 10000) })
              .where(eq(feedback_mail_jobs.id, job.id))
            continue
          }
          await tx.delete(feedback_mail_jobs).where(eq(feedback_mail_jobs.id, job.id))
        } catch {
          const attempts = job.attempts + 1
          logger.warn(
            { operation: 'feedbackDelivery', attempt: attempts, is_final: attempts >= 3 },
            'Feedback delivery failed',
          )
          await tx
            .update(feedback_mail_jobs)
            .set({ attempts, available_at: new Date(Date.now() + Math.min(attempts, 6) * 10000) })
            .where(eq(feedback_mail_jobs.id, job.id))
          if (job.expires_at < new Date())
            await tx.delete(feedback_mail_jobs).where(eq(feedback_mail_jobs.id, job.id))
        }
      }
      return jobs.length
    })
  }
  private schedule() {
    if (this.stopped) return
    this.timer = setTimeout(() => {
      this.running = this.flushOnce()
        .catch(() =>
          this.options.logger.warn({ operation: 'feedbackQueue' }, 'Feedback queue unavailable'),
        )
        .finally(() => this.schedule())
    }, 1000)
    this.timer.unref()
  }
}

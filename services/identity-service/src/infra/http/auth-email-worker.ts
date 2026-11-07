import nodemailer from 'nodemailer'
import { and, eq, lt, lte, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import type { Logger } from '@blog/logger'
import { auth_email_jobs, email_flows } from '../db/schema.ts'
import { EmailCodeCrypto } from '../../modules/auth/index.ts'

export type AuthMailTransport = {
  sendMail: (message: { from: string; to: string; subject: string; text: string; headers: Record<string, string> }) => Promise<unknown>
  close: () => void
}

export function createAuthMailTransport(options: {
  host: string; port: number; secure: boolean; user?: string; password?: string; require_tls: boolean
}): AuthMailTransport {
  return nodemailer.createTransport({
    host: options.host, port: options.port, secure: options.secure, requireTLS: options.require_tls,
    ...(options.user ? { auth: { user: options.user, pass: options.password } } : {}),
    connectionTimeout: 3000, greetingTimeout: 3000, socketTimeout: 3000,
    logger: false, debug: false,
  })
}

/** Transactional mail delivery with bounded retries; SMTP errors may contain PII, so never log them. */
export class AuthEmailWorker {
  private timer: NodeJS.Timeout | undefined
  private running: Promise<unknown> | undefined
  private is_stopped = true

  constructor(private readonly options: {
    db: Database; crypto: EmailCodeCrypto; transport: AuthMailTransport; from: string; logger: Pick<Logger, 'warn'>
  }) {}

  start(): void {
    this.is_stopped = false
    this.schedule()
  }

  async stop(): Promise<void> {
    this.is_stopped = true
    clearTimeout(this.timer)
    await this.running
    this.options.transport.close()
  }

  async flushOnce(): Promise<number> {
    const { db, crypto, transport, from, logger } = this.options
    return db.transaction(async (tx) => {
      const now = new Date()
      const jobs = await tx.select().from(auth_email_jobs).where(lte(auth_email_jobs.available_at, now))
        .orderBy(auth_email_jobs.available_at).limit(5).for('update', { skipLocked: true })
      for (const job of jobs) {
        const [flow] = await tx.select().from(email_flows).where(eq(email_flows.id, job.flow_id))
        if (!flow || flow.consumed_at || flow.verified_until || job.expires_at <= now) {
          await tx.delete(auth_email_jobs).where(eq(auth_email_jobs.id, job.id))
          continue
        }
        try {
          const message = crypto.decrypt(job.encrypted_message)
          await transport.sendMail({
            from, to: message.email,
            subject: message.purpose === 'registration' ? 'Код для регистрации' : 'Код для смены пароля',
            text: `${message.code}\n\n${message.purpose === 'registration' ? 'Код для регистрации' : 'Код для смены пароля'}. Действует 10 минут. Если вы не запрашивали код, проигнорируйте письмо.`,
            headers: { 'X-Auto-Response-Suppress': 'All' },
          })
          await tx.delete(auth_email_jobs).where(eq(auth_email_jobs.id, job.id))
        } catch {
          const attempts = job.attempts + 1
          logger.warn({ operation: 'authEmailDelivery', attempt: attempts, is_final: attempts >= 3 }, 'Не удалось отправить письмо авторизации')
          if (attempts >= 3) await tx.delete(auth_email_jobs).where(eq(auth_email_jobs.id, job.id))
          else await tx.update(auth_email_jobs).set({ attempts, available_at: new Date(now.getTime() + attempts * 10_000) })
            .where(eq(auth_email_jobs.id, job.id))
        }
      }
      // No flow remains usable after 15 minutes; retain at most one day of history.
      await tx.delete(email_flows).where(and(lt(email_flows.created_at, new Date(now.getTime() - 86_400_000)),
        sql`not exists (select 1 from auth_email_jobs where flow_id = ${email_flows.id})`))
      return jobs.length
    })
  }

  private schedule(): void {
    if (this.is_stopped) return
    this.timer = setTimeout(() => {
      this.running = this.flushOnce().catch(() => {
        this.options.logger.warn({ operation: 'authEmailQueue' }, 'Очередь писем временно недоступна')
      }).finally(() => this.schedule())
    }, 500)
    this.timer.unref()
  }
}

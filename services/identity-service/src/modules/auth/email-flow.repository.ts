import { randomUUID } from 'node:crypto'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { appendToOutbox } from '@blog/broker'
import { AppError } from '@blog/errors'
import type { Database } from '@blog/broker'
import { auth_email_jobs, email_flows, sessions } from '../../infra/db/schema.ts'
import { sessionRevokedEvent } from '../../shared/session-events.ts'
import { AuthRepository } from './auth.repository.ts'
import { EmailFlowError } from './email-flow.errors.ts'
import type { EmailFlow, EmailFlowRepositoryPort, EmailFlowStore } from './email-flow.types.ts'

/** Driver/provider errors can include SQL parameters or email addresses in their messages. */
function safeEmailFlowError(error: unknown): AppError {
  if (error instanceof AppError && error.http_status < 500) return error
  const cause = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code : 'provider_error'
  return new AppError({ code: 'auth_unavailable', http_status: 503, message: 'Авторизация временно недоступна', cause })
}

function storeFor(tx: Database, email: string): EmailFlowStore {
  return {
    auth: new AuthRepository(tx),
    async latest() {
      const [row] = await tx.select().from(email_flows).where(eq(email_flows.email, email))
        .orderBy(desc(email_flows.created_at), desc(email_flows.id)).limit(1)
      return row ?? null
    },
    async find(flow_id) {
      const [row] = await tx.select().from(email_flows)
        .where(and(eq(email_flows.id, flow_id), eq(email_flows.email, email))).for('update')
      return row ?? null
    },
    async save(flow) {
      await tx.insert(email_flows).values(flow).onConflictDoUpdate({ target: email_flows.id, set: flow })
    },
    async invalidate(now) {
      await tx.update(email_flows).set({ consumed_at: now })
        .where(and(eq(email_flows.email, email), isNull(email_flows.consumed_at)))
      // An obsolete code must not be delivered after a resend.
      await tx.delete(auth_email_jobs).where(sql`${auth_email_jobs.flow_id} in (select id from email_flows where email = ${email})`)
    },
    async enqueue(flow, encrypted_message) {
      await tx.delete(auth_email_jobs).where(eq(auth_email_jobs.flow_id, flow.id))
      await tx.insert(auth_email_jobs).values({
        id: randomUUID(), flow_id: flow.id, encrypted_message,
        available_at: flow.created_at, expires_at: flow.expires_at,
      })
    },
    async revokeSessions(user_id, correlation_id, now) {
      const rows = await tx.update(sessions).set({ revoked_at: now })
        .where(and(eq(sessions.user_id, user_id), isNull(sessions.revoked_at))).returning({ id: sessions.id })
      if (rows.length) await appendToOutbox(tx, sessionRevokedEvent({ user_id, correlation_id, session_ids: rows.map((row) => row.id) }))
    },
  }
}

/** Every operation locks the email first, including completions in separate tabs/processes. */
export class EmailFlowRepository implements EmailFlowRepositoryPort {
  constructor(private readonly db: Database) {}

  async withEmail<T>(email: string, work: (store: EmailFlowStore) => Promise<T>): Promise<T> {
    try {
      return await this.db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${email}, 0))`)
        return work(storeFor(tx, email))
      })
    } catch (error) { throw safeEmailFlowError(error) }
  }

  async withFlow<T>(flow_id: string, work: (flow: EmailFlow, store: EmailFlowStore) => Promise<T>): Promise<T> {
    try {
      const [row] = await this.db.select({ email: email_flows.email }).from(email_flows).where(eq(email_flows.id, flow_id))
      if (!row) throw new EmailFlowError('flow_expired')
      return await this.withEmail(row.email, async (store) => {
        const flow = await store.find(flow_id)
        if (!flow) throw new EmailFlowError('flow_expired')
        return work(flow, store)
      })
    } catch (error) { throw safeEmailFlowError(error) }
  }
}

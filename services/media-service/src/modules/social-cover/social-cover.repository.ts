import { randomUUID } from 'node:crypto'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import { SocialCoverGeneratedV1, SocialCoverRequestedV1 } from '@blog/contracts'
import type { SocialImages } from '@blog/contracts'
import { social_cover_jobs } from '../../infra/db/schema.ts'

export type CoverJob = { event: SocialCoverRequestedV1; attempts: number; lease_id: string }
export type CoverJobsRepository = {
  enqueue: (tx: Database, event: SocialCoverRequestedV1) => Promise<void>
  claim: () => Promise<CoverJob | null>
  complete: (job: CoverJob, images: SocialImages) => Promise<void>
  fail: (job: CoverJob, message: string) => Promise<void>
  counts: () => Promise<{ pending: number; failed: number }>
}

export function createCoverJobsRepository(db: Database): CoverJobsRepository {
  const identity = (job: CoverJob) => and(eq(social_cover_jobs.target_id, job.event.target_id), eq(social_cover_jobs.revision, job.event.revision), eq(social_cover_jobs.lease_id, job.lease_id), eq(social_cover_jobs.status, 'processing'))
  return {
    async enqueue(tx, event) {
      await tx.insert(social_cover_jobs).values({ target_id: event.target_id, revision: event.revision, event }).onConflictDoNothing()
      // A newly public article can request a previously completed version after its reference was removed.
      const [existing] = await tx.select({ status: social_cover_jobs.status }).from(social_cover_jobs).where(and(eq(social_cover_jobs.target_id, event.target_id), eq(social_cover_jobs.revision, event.revision))).limit(1)
      if (existing?.status === 'ready' || existing?.status === 'failed') {
        await tx.update(social_cover_jobs).set({ status: 'pending', event, attempts: 0, available_at: new Date(), lease_id: null, lease_until: null })
          .where(and(eq(social_cover_jobs.target_id, event.target_id), eq(social_cover_jobs.revision, event.revision), inArray(social_cover_jobs.status, ['ready', 'failed'])))
      }
    },
    async claim() {
      return db.transaction(async (tx) => {
        const [row] = await tx.select({ target_id: social_cover_jobs.target_id, revision: social_cover_jobs.revision, event: social_cover_jobs.event, attempts: social_cover_jobs.attempts })
          .from(social_cover_jobs).where(sql`(${social_cover_jobs.status} = 'pending' and ${social_cover_jobs.available_at} <= now()) or (${social_cover_jobs.status} = 'processing' and ${social_cover_jobs.lease_until} < now())`)
          .orderBy(social_cover_jobs.available_at).limit(1).for('update', { skipLocked: true })
        if (!row) return null
        const lease_id = randomUUID()
        await tx.update(social_cover_jobs).set({ status: 'processing', attempts: row.attempts + 1, lease_id, lease_until: sql`now() + interval '180 seconds'` })
          .where(and(eq(social_cover_jobs.target_id, row.target_id), eq(social_cover_jobs.revision, row.revision)))
        return { event: SocialCoverRequestedV1.parse(row.event), attempts: row.attempts + 1, lease_id }
      })
    },
    async complete(job, images) {
      await db.transaction(async (tx) => {
        const updated = await tx.update(social_cover_jobs).set({ status: 'ready', lease_id: null, lease_until: null, last_error: null }).where(identity(job)).returning({ target_id: social_cover_jobs.target_id })
        if (updated.length === 0) return
        await appendToOutbox(tx, SocialCoverGeneratedV1.parse({
          event_id: newEventId(), name: 'media.social_cover.generated', version: 1, occurred_at: new Date().toISOString(),
          correlation_id: job.event.correlation_id, causation_id: job.event.event_id,
          target_id: job.event.target_id, revision: job.event.revision, images,
        }))
      })
    },
    async fail(job, message) {
      const delay = Math.min(30_000, 500 * 2 ** (job.attempts - 1))
      await db.update(social_cover_jobs).set({ status: job.attempts >= 5 ? 'failed' : 'pending', available_at: new Date(Date.now() + delay / 2 + Math.random() * delay / 2), lease_id: null, lease_until: null, last_error: message.slice(0, 1000) }).where(identity(job))
    },
    async counts() {
      const [row] = await db.select({ pending: sql<number>`count(*) filter (where status in ('pending', 'processing'))::int`, failed: sql<number>`count(*) filter (where status = 'failed')::int` }).from(social_cover_jobs)
      return row ?? { pending: 0, failed: 0 }
    },
  }
}

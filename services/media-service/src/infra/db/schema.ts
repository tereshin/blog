import type { SocialCoverRequestedV1 } from '@blog/contracts'
export { outbox, processed_events } from '@blog/broker'
import { integer, jsonb, pgEnum, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { pgTable } from 'drizzle-orm/pg-core'

export const file_kind = pgEnum('file_kind', ['image', 'attachment'])

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey(),
    uploader_id: uuid('uploader_id').notNull(),
    kind: file_kind('kind').notNull(),
    mime: text('mime').notNull(),
    byte_size: integer('byte_size').notNull(),
    url: text('url').notNull(),
    idempotency_key: text('idempotency_key').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('files_uploader_key_idx').on(table.uploader_id, table.idempotency_key)],
)

export const seed_runs = pgTable('seed_runs', {
  profile: text('profile').primaryKey(),
  anchor_at: timestamp('anchor_at', { withTimezone: true }).notNull(),
  started_at: timestamp('started_at', { withTimezone: true }).notNull(),
  finished_at: timestamp('finished_at', { withTimezone: true }),
})

export const social_cover_jobs = pgTable('social_cover_jobs', {
  target_id: text('target_id').notNull(),
  revision: text('revision').notNull(),
  event: jsonb('event').$type<SocialCoverRequestedV1>().notNull(),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  available_at: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
  lease_until: timestamp('lease_until', { withTimezone: true }),
  lease_id: uuid('lease_id'),
  last_error: text('last_error'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('social_cover_jobs_target_revision_idx').on(table.target_id, table.revision)])

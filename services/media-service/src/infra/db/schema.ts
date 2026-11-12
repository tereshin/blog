import type { ImageCompression, SocialCoverRequestedV1 } from '@blog/contracts'
export { outbox, processed_events } from '@blog/broker'
import { integer, jsonb, pgEnum, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { pgTable } from 'drizzle-orm/pg-core'

export const file_kind = pgEnum('file_kind', ['image', 'attachment', 'favicon'])

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
    storage_id: uuid('storage_id').references(() => media_storage_configs.id),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('files_uploader_key_idx').on(table.uploader_id, table.idempotency_key)],
)

export const media_storage_configs = pgTable('media_storage_configs', {
  id: uuid('id').primaryKey(),
  public_url: text('public_url').notNull(),
  encrypted_config: text('encrypted_config').notNull(),
})

export const media_settings = pgTable('media_settings', {
  id: integer('id').primaryKey(),
  compression: jsonb('compression').$type<ImageCompression>().notNull(),
  storage_id: uuid('storage_id').references(() => media_storage_configs.id),
})

export const seed_runs = pgTable('seed_runs', {
  profile: text('profile').primaryKey(),
  anchor_at: timestamp('anchor_at', { withTimezone: true }).notNull(),
  started_at: timestamp('started_at', { withTimezone: true }).notNull(),
  finished_at: timestamp('finished_at', { withTimezone: true }),
})

export const social_cover_jobs = pgTable(
  'social_cover_jobs',
  {
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
  },
  (table) => [
    uniqueIndex('social_cover_jobs_target_revision_idx').on(table.target_id, table.revision),
  ],
)

// Temporary private form files are never exposed through public object storage.
export const feedback_files = pgTable('feedback_files', {
  id: uuid('id').primaryKey(), token_hash: text('token_hash').notNull(), name: text('name').notNull(), mime: text('mime').notNull(),
  byte_size: integer('byte_size').notNull(), content: text('content').notNull(), key: text('key').notNull(),
  submission_id: uuid('submission_id'), expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
}, table => [uniqueIndex('feedback_files_token_key').on(table.token_hash, table.key)])

import { integer, pgEnum, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
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

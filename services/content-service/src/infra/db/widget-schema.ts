import { pgTable, integer, jsonb, uuid, text, timestamp, primaryKey } from 'drizzle-orm/pg-core'

export const sidebar_config = pgTable('sidebar_config', {
  id: integer('id').primaryKey(),
  version: integer('version').notNull(),
  config: jsonb('config').$type<import('@blog/contracts').Sidebar>().notNull(),
})
export const widget_mutations = pgTable(
  'widget_mutations',
  {
    actor_id: uuid('actor_id').notNull(),
    key: text('key').notNull(),
    fingerprint: text('fingerprint').notNull(),
    response: jsonb('response').notNull(),
  },
  (table) => [primaryKey({ columns: [table.actor_id, table.key] })],
)
export const feedback_submissions = pgTable('feedback_submissions', {
  id: uuid('id').primaryKey(),
  key: text('key').notNull().unique(),
  fingerprint: text('fingerprint').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const feedback_delivery = pgTable('feedback_delivery', {
  id: uuid('id').primaryKey(),
  token_hash: text('token_hash').notNull(),
  payload: jsonb('payload').notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
})

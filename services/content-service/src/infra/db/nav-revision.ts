import { integer, pgTable } from 'drizzle-orm/pg-core'
export const nav_revision = pgTable('nav_revision', {
  id: integer('id').primaryKey(),
  version: integer('version').notNull(),
})

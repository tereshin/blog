import { pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const categories_schema = pgSchema('categories');

export const categories_table = categories_schema.table('categories', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const category_translations = categories_schema.table(
  'category_translations',
  {
    category_id: uuid('category_id').notNull(),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
    description: text('description'),
  },
  (table) => [primaryKey({ columns: [table.category_id, table.locale] })],
);

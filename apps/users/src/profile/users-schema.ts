import { date, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users_schema = pgSchema('users');

export const users_table = users_schema.table('users', {
  id: uuid('id').primaryKey(),
  firebase_uid: text('firebase_uid').notNull(),
  username: text('username'),
  display_name: text('display_name'),
  biography: text('biography'),
  avatar_url: text('avatar_url'),
  role: text('role').notNull().default('user'),
  content_languages: text('content_languages').array(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const user_sign_ins = users_schema.table(
  'user_sign_ins',
  {
    user_id: uuid('user_id').notNull(),
    signed_on: date('signed_on', { mode: 'string' }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.user_id, table.signed_on] })],
);

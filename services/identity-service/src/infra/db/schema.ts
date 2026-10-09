import { boolean, jsonb, pgEnum, pgTable, primaryKey, serial, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Таблицы outbox и processed_events описаны в @blog/broker и создаются миграцией этого сервиса.
export { outbox, processed_events } from '@blog/broker'

export const user_role = pgEnum('user_role', ['member', 'admin', 'superadmin'])
export const appearance = pgEnum('appearance', ['light', 'dark'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  public_number: serial('public_number').notNull().unique(),
  /** Пустая строка, пока адрес не указан и поставщик его не подтвердил. Несколько пустых допустимы. */
  email: text('email').notNull().default(''),
  email_verified: boolean('email_verified').notNull().default(false),
  role: user_role('role').notNull().default('member'),
  can_publish: boolean('can_publish').notNull().default(true),
  restricted_at: timestamp('restricted_at', { withTimezone: true }),
  appearance: appearance('appearance'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Несколько способов входа на одного участника. Почта на строке не хранится. */
export const auth_identities = pgTable('auth_identities', {
  id: uuid('id').primaryKey(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id),
  firebase_uid: text('firebase_uid').notNull().unique(),
  provider_id: text('provider_id').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked_at: timestamp('revoked_at', { withTimezone: true }),
})

/** Копия настроек площадки: владелец — content-service, сюда приходит по событию. */
export const settings_copy = pgTable('settings_copy', {
  id: smallint('id').primaryKey().default(1),
  registration_open: boolean('registration_open').notNull().default(true),
  new_members_can_publish: boolean('new_members_can_publish').notNull().default(true),
})

/** Повтор мутации с тем же ключом не создаёт вторую строку. */
export const auth_idempotency = pgTable(
  'auth_idempotency',
  {
    scope: text('scope').notNull(),
    key: text('key').notNull(),
    response: jsonb('response').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.scope, table.key] })],
)

export const seed_runs = pgTable('seed_runs', {
  profile: text('profile').primaryKey(),
  anchor_at: timestamp('anchor_at', { withTimezone: true }).notNull(),
  started_at: timestamp('started_at', { withTimezone: true }).notNull(),
  finished_at: timestamp('finished_at', { withTimezone: true }),
})

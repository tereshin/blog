import { boolean, pgEnum, pgTable, serial, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Таблицы outbox и processed_events описаны в @blog/broker и создаются миграцией этого сервиса.
export { outbox, processed_events } from '@blog/broker'

export const user_role = pgEnum('user_role', ['member', 'admin', 'superadmin'])
export const appearance = pgEnum('appearance', ['light', 'dark'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  public_number: serial('public_number').notNull().unique(),
  // Пусто только у суперадминистратора, созданного `bootstrap-prod`, до его первого входа.
  google_sub: text('google_sub').unique(),
  email: text('email').notNull(),
  role: user_role('role').notNull().default('member'),
  can_publish: boolean('can_publish').notNull().default(true),
  restricted_at: timestamp('restricted_at', { withTimezone: true }),
  appearance: appearance('appearance'),
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

/** Одноразовое состояние входа: `state` → PKCE и адрес возврата. Живёт минуты, не сессию. */
export const auth_states = pgTable('auth_states', {
  state: text('state').primaryKey(),
  code_verifier: text('code_verifier').notNull(),
  nonce: text('nonce').notNull(),
  return_to: text('return_to').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const seed_runs = pgTable('seed_runs', {
  profile: text('profile').primaryKey(),
  anchor_at: timestamp('anchor_at', { withTimezone: true }).notNull(),
  started_at: timestamp('started_at', { withTimezone: true }).notNull(),
  finished_at: timestamp('finished_at', { withTimezone: true }),
})

import { baseEnvSchema, defineEnv, rejectPlaceholders } from '@blog/config'
import { z } from 'zod'

export const GOOGLE_PROD_ISSUER = 'https://accounts.google.com'

const envSchema = baseEnvSchema.extend({
  HTTP_PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  NATS_URL: z.string().min(1),
  SERVICE_JWT_PUBLIC_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.url(),
  GOOGLE_ISSUER_URL: z.url(),
  SUPERADMIN_EMAIL: z.email(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
})

export type Env = z.infer<typeof envSchema>

/** Единственное место чтения окружения сервиса: падает при старте, если чего-то нет. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const env = defineEnv(envSchema, source)
  // В prod вход возможен только через настоящий Google: чужой издатель роняет старт (FR-132).
  if (env.APP_ENV === 'prod' && env.GOOGLE_ISSUER_URL.replace(/\/$/, '') !== GOOGLE_PROD_ISSUER) {
    throw new Error(`В prod GOOGLE_ISSUER_URL обязан быть ${GOOGLE_PROD_ISSUER}`)
  }
  rejectPlaceholders(env, ['GOOGLE_CLIENT_SECRET', 'DATABASE_URL'])
  return env
}

const migrateEnvSchema = baseEnvSchema.extend({ DATABASE_URL: z.string().min(1) })

/** Одноразовой задаче миграции нужны только `APP_ENV` и `DATABASE_URL`. */
export function loadMigrateEnv(source: Record<string, string | undefined> = process.env): z.infer<typeof migrateEnvSchema> {
  const env = defineEnv(migrateEnvSchema, source)
  rejectPlaceholders(env, ['DATABASE_URL'])
  return env
}

const seedEnvSchema = baseEnvSchema.extend({
  DATABASE_URL: z.string().min(1),
  SUPERADMIN_EMAIL: z.email(),
  S3_PUBLIC_URL: z.string().optional(),
})

export type SeedEnv = z.infer<typeof seedEnvSchema>

/** Окружение одноразовой задачи seed: без брокера и ключей, только база и параметры данных. */
export function loadSeedEnv(source: Record<string, string | undefined> = process.env): SeedEnv {
  const env = defineEnv(seedEnvSchema, source)
  rejectPlaceholders(env, ['DATABASE_URL'])
  return env
}

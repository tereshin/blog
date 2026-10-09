import { baseEnvSchema, defineEnv, rejectPlaceholders } from '@blog/config'
import { z } from 'zod'

const envSchema = baseEnvSchema.extend({
  HTTP_PORT: z.coerce.number().int().positive().default(3005),
  DATABASE_URL: z.string().min(1),
  NATS_URL: z.string().min(1),
  SERVICE_JWT_PUBLIC_KEY: z.string().min(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
})

export type Env = z.infer<typeof envSchema>

/** Единственное место чтения окружения сервиса: падает при старте, если чего-то нет. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const env = defineEnv(envSchema, source)
  rejectPlaceholders(env, ['DATABASE_URL'])
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
  S3_PUBLIC_URL: z.url(),
  SUPERADMIN_EMAIL: z.email(),
})

export type SeedEnv = z.infer<typeof seedEnvSchema>

/** Одноразовая задача seed: база и адреса файлов, без брокера. */
export function loadSeedEnv(source: Record<string, string | undefined> = process.env): SeedEnv {
  const env = defineEnv(seedEnvSchema, source)
  rejectPlaceholders(env, ['DATABASE_URL'])
  return env
}

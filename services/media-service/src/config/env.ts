import { baseEnvSchema, defineEnv, rejectPlaceholders } from '@blog/config'
import { z } from 'zod'

const EnvSchema = baseEnvSchema.extend({
  NATS_URL: z.string().min(1).default('nats://localhost:4222'),
  HTTP_PORT: z.coerce.number().int().positive().default(3006),
  DATABASE_URL: z.string().min(1),
  SERVICE_JWT_PUBLIC_KEY: z.string().min(1),
  S3_ENDPOINT: z.url(),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_PUBLIC_URL: z.url(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
})

export type Env = z.infer<typeof EnvSchema>

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const env = defineEnv(EnvSchema, source)
  rejectPlaceholders(env, ['DATABASE_URL', 'S3_SECRET_KEY', 'S3_ACCESS_KEY'])
  return env
}

const MigrateEnvSchema = baseEnvSchema.extend({ DATABASE_URL: z.string().min(1) })

export function loadMigrateEnv(source: Record<string, string | undefined> = process.env): z.infer<typeof MigrateEnvSchema> {
  const env = defineEnv(MigrateEnvSchema, source)
  rejectPlaceholders(env, ['DATABASE_URL'])
  return env
}

const SeedEnvSchema = baseEnvSchema.extend({
  DATABASE_URL: z.string().min(1),
  S3_ENDPOINT: z.url(),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_PUBLIC_URL: z.url(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  SUPERADMIN_EMAIL: z.email(),
})

export type SeedEnv = z.infer<typeof SeedEnvSchema>

/** Первая проверка seed: только `APP_ENV`, чтобы в prod задача завершилась до чтения остального окружения. */
export function loadSeedAppEnv(source: Record<string, string | undefined> = process.env): z.infer<typeof baseEnvSchema> {
  return defineEnv(baseEnvSchema, source)
}

/** Одноразовая задача seed: база, MinIO и те же публичные адреса, что у статей. */
export function loadSeedEnv(source: Record<string, string | undefined> = process.env): SeedEnv {
  const env = defineEnv(SeedEnvSchema, source)
  rejectPlaceholders(env, ['DATABASE_URL', 'S3_SECRET_KEY', 'S3_ACCESS_KEY'])
  return env
}

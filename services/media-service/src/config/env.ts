import { baseEnvSchema, defineEnv, rejectPlaceholders } from '@blog/config'
import { z } from 'zod'

const envSchema = baseEnvSchema.extend({
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

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const env = defineEnv(envSchema, source)
  rejectPlaceholders(env, ['DATABASE_URL', 'S3_SECRET_KEY', 'S3_ACCESS_KEY'])
  return env
}

const migrateEnvSchema = baseEnvSchema.extend({ DATABASE_URL: z.string().min(1) })

export function loadMigrateEnv(source: Record<string, string | undefined> = process.env): z.infer<typeof migrateEnvSchema> {
  const env = defineEnv(migrateEnvSchema, source)
  rejectPlaceholders(env, ['DATABASE_URL'])
  return env
}

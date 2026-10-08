import { baseEnvSchema, defineEnv, rejectPlaceholders } from '@blog/config'
import { z } from 'zod'

const envSchema = baseEnvSchema.extend({
  HTTP_PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_ORIGIN: z.url(),
  WEB_ORIGIN: z.url(),
  SESSION_COOKIE_NAME: z.string().min(1),
  GUEST_COOKIE_NAME: z.string().min(1),
  CSRF_COOKIE_NAME: z.string().min(1),
  SERVICE_JWT_PRIVATE_KEY: z.string().min(1),
  IDENTITY_URL: z.url(),
  CONTENT_URL: z.url(),
  DISCUSSION_URL: z.url(),
  MESSAGING_URL: z.url(),
  NOTIFICATION_URL: z.url(),
  MEDIA_URL: z.url(),
  NATS_URL: z.string().min(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
})

export type Env = z.infer<typeof envSchema>

/** Единственное место чтения окружения gateway: падает при старте, если чего-то нет. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const env = defineEnv(envSchema, source)
  // В prod заглушка вместо ключа подписи служебного контекста роняет старт.
  rejectPlaceholders(env, ['SERVICE_JWT_PRIVATE_KEY'])
  return env
}

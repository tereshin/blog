import { baseEnvSchema, defineEnv, rejectPlaceholders } from '@blog/config'
import { z } from 'zod'

export function firebaseProdIssuer(project_id: string): string {
  return `https://securetoken.google.com/${project_id}`
}

const firebaseSchema = {
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_AUTH_DOMAIN: z.string().min(1),
  FIREBASE_WEB_API_KEY: z.string().min(1),
  FIREBASE_SERVER_API_KEY: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().min(1).optional(),
  SEED_AUTH_PASSWORD: z.string().min(1).optional(),
}

const envSchema = baseEnvSchema.extend({
  HTTP_PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  NATS_URL: z.string().min(1),
  SERVICE_JWT_PUBLIC_KEY: z.string().min(1),
  SUPERADMIN_EMAIL: z.email(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  ...firebaseSchema,
})

export type Env = z.infer<typeof envSchema>

function assertFirebaseEnv(env: Env): void {
  const localish = env.APP_ENV === 'local' || env.APP_ENV === 'dev'
  if (!localish && (env.FIREBASE_AUTH_EMULATOR_HOST || env.SEED_AUTH_PASSWORD)) {
    throw new Error('FIREBASE_AUTH_EMULATOR_HOST и SEED_AUTH_PASSWORD допустимы только в local и dev')
  }
  if (env.APP_ENV === 'prod') {
    if (env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('В prod эмулятор Firebase Auth запрещён')
    const issuer = firebaseProdIssuer(env.FIREBASE_PROJECT_ID)
    if (issuer !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`) {
      throw new Error(`В prod издатель ID-токена обязан быть ${issuer}`)
    }
    rejectPlaceholders(env, [
      'FIREBASE_WEB_API_KEY',
      'FIREBASE_SERVER_API_KEY',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
      'DATABASE_URL',
    ])
  }
}

/** Единственное место чтения окружения сервиса: падает при старте, если чего-то нет. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const env = defineEnv(envSchema, source)
  assertFirebaseEnv(env)
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
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().min(1).optional(),
  SEED_AUTH_PASSWORD: z.string().min(1).optional(),
})

export type SeedEnv = z.infer<typeof seedEnvSchema>

/** Окружение одноразовой задачи seed: без брокера и ключей, только база и параметры данных. */
export function loadSeedEnv(source: Record<string, string | undefined> = process.env): SeedEnv {
  const env = defineEnv(seedEnvSchema, source)
  rejectPlaceholders(env, ['DATABASE_URL'])
  if (env.APP_ENV === 'prod' && (env.FIREBASE_AUTH_EMULATOR_HOST || env.SEED_AUTH_PASSWORD)) {
    throw new Error('В prod эмулятор и тестовый пароль запрещены')
  }
  return env
}

const bootstrapEnvSchema = baseEnvSchema.extend({
  DATABASE_URL: z.string().min(1),
  SUPERADMIN_EMAIL: z.email(),
})

export type BootstrapEnv = z.infer<typeof bootstrapEnvSchema>

/** Окружение `bootstrap`: база и почта суперадминистратора. Без почты процесс не стартует. */
export function loadBootstrapEnv(source: Record<string, string | undefined> = process.env): BootstrapEnv {
  const env = defineEnv(bootstrapEnvSchema, source)
  rejectPlaceholders(env, ['DATABASE_URL', 'SUPERADMIN_EMAIL'])
  return env
}

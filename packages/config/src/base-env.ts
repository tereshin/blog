import { z } from 'zod'

export const APP_ENVS = ['local', 'dev', 'prod'] as const

/** Общая часть схемы окружения каждого сервиса: `APP_ENV` обязателен. */
export const baseEnvSchema = z.object({
  APP_ENV: z.enum(APP_ENVS),
})

export type BaseEnv = z.infer<typeof baseEnvSchema>

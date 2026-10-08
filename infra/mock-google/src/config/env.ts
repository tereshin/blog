import { z } from 'zod'

const envSchema = z.object({
  APP_ENV: z.enum(['local', 'dev', 'prod']),
  HTTP_PORT: z.coerce.number().int().positive().default(8081),
  /** Адрес издателя: совпадает с `GOOGLE_ISSUER_URL` identity и открывается одинаково браузером и контейнером. */
  ISSUER_URL: z.url(),
  CLIENT_ID: z.string().min(1),
  CLIENT_SECRET: z.string().min(1),
  REDIRECT_URI: z.url(),
  /** Почта суперадминистратора: та же, что `SUPERADMIN_EMAIL` identity. */
  SUPERADMIN_EMAIL: z.email(),
  S3_PUBLIC_URL: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

/** Тестовый провайдер не должен существовать в prod: даже случайный запуск там падает на старте. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse({ ...source, HTTP_PORT: source.HTTP_PORT ?? source.PORT })
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))].join(', ')
    throw new Error(`mock-google: не заданы или неверны переменные: ${names}`)
  }
  if (result.data.APP_ENV === 'prod') throw new Error('mock-google не запускается в prod: вход идёт только через настоящий Google')
  return result.data
}

import { z } from 'zod'

// Единственное место, где читается import.meta.env (react-architecture.mdc).
// Здесь только несекретные значения: всё, что попадает в бандл, считается публичным.
const envSchema = z.object({
  // Пустая строка допустима: в prod клиент и gateway на одном origin.
  VITE_API_BASE_URL: z.string().default(''),
  VITE_API_MOCK: z
    .string()
    .default('')
    .transform((value) => value === '1'),
  // Имя не-HttpOnly cookie с CSRF-токеном (double-submit); задаёт gateway (`CSRF_COOKIE_NAME`).
  VITE_CSRF_COOKIE_NAME: z.string().default('blog_csrf'),
})

const parsed = envSchema.safeParse(import.meta.env)
if (!parsed.success) {
  throw new Error(`Некорректная конфигурация клиента: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`)
}

export const env = {
  api_base_url: parsed.data.VITE_API_BASE_URL,
  is_api_mock: parsed.data.VITE_API_MOCK,
  csrf_cookie_name: parsed.data.VITE_CSRF_COOKIE_NAME,
} as const

import { z } from 'zod'

/** Заголовок, которым gateway передаёт identity идентификатор сессии из cookie. Клиент его не ставит. */
export const SESSION_ID_HEADER = 'x-session-id'

export const sessionUserSchema = z.strictObject({
  id: z.uuid(),
  public_number: z.number().int().positive(),
  role: z.enum(['member', 'admin', 'superadmin']),
  can_publish: z.boolean(),
  is_restricted: z.boolean(),
  appearance: z.enum(['light', 'dark']).nullable(),
})
export type SessionUser = z.infer<typeof sessionUserSchema>

export const sessionProfileSchema = z.strictObject({
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  /** Короткий адрес или номер учётной записи, если короткого нет. */
  slug: z.string(),
})
export type SessionProfile = z.infer<typeof sessionProfileSchema>

/** `GET /v1/auth/session`: гость не ходит в identity, участник — пользователь и краткий профиль. */
export const sessionResponseSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('guest'), viewer_key: z.string().optional() }),
  z.strictObject({ status: z.literal('member'), user: sessionUserSchema, profile: sessionProfileSchema }),
])
export type SessionResponse = z.infer<typeof sessionResponseSchema>

/** `PATCH /v1/users/me/appearance`: выбор вида хранится в учётной записи. */
export const updateAppearanceSchema = z.strictObject({
  appearance: z.enum(['light', 'dark']),
})
export type UpdateAppearance = z.infer<typeof updateAppearanceSchema>

/** Ответ identity gateway на успешный callback: cookie ставит gateway, не сервис. */
export const authCallbackSuccessSchema = z.strictObject({
  session_id: z.string().min(16),
  return_to: z.string(),
})

export const AUTH_CALLBACK_ERRORS = ['registration_closed', 'restricted', 'email_unverified', 'email_taken'] as const

export const authCallbackErrorSchema = z.strictObject({
  error: z.enum(AUTH_CALLBACK_ERRORS),
  return_to: z.string(),
})
export type AuthCallbackError = z.infer<typeof authCallbackErrorSchema>

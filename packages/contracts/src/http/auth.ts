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
  /** Своя почта или `null`, пока адрес не указан и поставщик его не подтвердил. */
  email: z.string().nullable(),
  email_verified: z.boolean(),
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

/** `GET /v1/auth/config`. `test_*` только вместе с заданным `emulator_host`. */
export const authConfigSchema = z
  .strictObject({
    api_key: z.string().min(1),
    auth_domain: z.string().min(1),
    project_id: z.string().min(1),
    providers: z.array(z.strictObject({ id: z.string().min(1) })),
    emulator_host: z.string().min(1).nullable(),
    test_participants: z.array(z.strictObject({ email: z.string().min(1), label: z.string().min(1) })).optional(),
    test_password: z.string().min(1).optional(),
  })
  .refine((value) => {
    const has_test = value.test_participants !== undefined || value.test_password !== undefined
    if (value.emulator_host === null) return !has_test
    const both = value.test_participants !== undefined && value.test_password !== undefined
    const neither = value.test_participants === undefined && value.test_password === undefined
    return both || neither
  }, 'test_participants и test_password задаются только вместе и только при emulator_host')
export type AuthConfig = z.infer<typeof authConfigSchema>

export const pendingAuthSchema = z.strictObject({ status: z.literal('pending') })
export type PendingAuth = z.infer<typeof pendingAuthSchema>

export const authOkSchema = z.strictObject({ status: z.literal('ok') })
export type AuthOk = z.infer<typeof authOkSchema>

export const registrationBodySchema = z.strictObject({
  display_name: z.string().trim().min(1).max(50).optional(),
  email: z.string(),
  password: z.string(),
})
export type RegistrationBody = z.infer<typeof registrationBodySchema>

export const createSessionBodySchema = z.discriminatedUnion('method', [
  z.strictObject({ method: z.literal('password'), email: z.string(), password: z.string() }),
  z.strictObject({ method: z.literal('id_token'), id_token: z.string().min(1) }),
])
export type CreateSessionBody = z.infer<typeof createSessionBodySchema>

export const emailClaimBodySchema = z.strictObject({ email: z.string() })
export type EmailClaimBody = z.infer<typeof emailClaimBodySchema>

export const emailVerificationConfirmBodySchema = z.strictObject({ oob_code: z.string().min(1) })
export type EmailVerificationConfirmBody = z.infer<typeof emailVerificationConfirmBodySchema>

export const passwordResetBodySchema = z.strictObject({ email: z.string() })
export type PasswordResetBody = z.infer<typeof passwordResetBodySchema>

export const passwordResetConfirmBodySchema = z.strictObject({
  oob_code: z.string().min(1),
  password: z.string(),
})
export type PasswordResetConfirmBody = z.infer<typeof passwordResetConfirmBodySchema>

/**
 * Маршруты `GET /v1/auth/google` сняты. Схемы callback не экспортируются.
 * Успех `POST /v1/auth/sessions` отдаёт gateway идентификатор сессии заголовком, не телом браузеру.
 */
export const sessionCreatedSchema = z.strictObject({
  session_id: z.string().min(16),
  max_age_seconds: z.number().int().positive(),
})
export type SessionCreated = z.infer<typeof sessionCreatedSchema>

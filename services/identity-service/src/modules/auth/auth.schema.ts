import { z } from 'zod'
import {
  authConfigSchema,
  authOkSchema,
  createSessionBodySchema,
  emailClaimBodySchema,
  emailVerificationConfirmBodySchema,
  passwordResetBodySchema,
  passwordResetConfirmBodySchema,
  pendingAuthSchema,
  registrationBodySchema,
  sessionUserSchema,
} from '@blog/contracts'

export const AuthConfigSchema = authConfigSchema
export const AuthOkSchema = authOkSchema
export const CreateSessionBodySchema = createSessionBodySchema
export const EmailClaimBodySchema = emailClaimBodySchema
export const EmailVerificationConfirmBodySchema = emailVerificationConfirmBodySchema
export const PasswordResetBodySchema = passwordResetBodySchema
export const PasswordResetConfirmBodySchema = passwordResetConfirmBodySchema
export const PendingAuthSchema = pendingAuthSchema
export const RegistrationBodySchema = registrationBodySchema

/** Ответ identity на `GET /v1/auth/session` для вошедшего. Профиль подставляет gateway. */
export const IdentityMemberSessionSchema = z.strictObject({
  status: z.literal('member'),
  user: sessionUserSchema,
  display_name_hint: z.string().min(1).max(50),
})

export const GuestSessionSchema = z.strictObject({ status: z.literal('guest') })

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

export {
  authConfigSchema,
  authOkSchema,
  createSessionBodySchema,
  emailClaimBodySchema,
  emailVerificationConfirmBodySchema,
  passwordResetBodySchema,
  passwordResetConfirmBodySchema,
  pendingAuthSchema,
  registrationBodySchema,
}

/** Ответ identity на `GET /v1/auth/session` для вошедшего. Профиль подставляет gateway. */
export const identityMemberSessionSchema = z.strictObject({
  status: z.literal('member'),
  user: sessionUserSchema,
  display_name_hint: z.string().min(1).max(50),
})

export const guestSessionSchema = z.strictObject({ status: z.literal('guest') })

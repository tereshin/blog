import { authConfigSchema, authOkSchema, pendingAuthSchema } from '@blog/contracts'
import type { AuthConfig } from '@blog/contracts'
import { emptyResponseSchema, http } from '@/shared/api'

export function getAuthConfig(signal?: AbortSignal): Promise<AuthConfig> {
  return http.get('/v1/auth/config', authConfigSchema, { signal })
}

export function registerWithPassword(email: string, password: string, display_name: string): Promise<{ status: 'pending' }> {
  return http.post('/v1/auth/registrations', pendingAuthSchema, { body: { email, password, display_name } })
}

export function signInWithPassword(email: string, password: string): Promise<void> {
  return http.post('/v1/auth/sessions', emptyResponseSchema, { body: { method: 'password', email, password } })
}

export function signInWithIdToken(id_token: string): Promise<void> {
  return http.post('/v1/auth/sessions', emptyResponseSchema, { body: { method: 'id_token', id_token } })
}

export function claimEmail(email: string): Promise<{ status: 'pending' }> {
  return http.post('/v1/auth/email-claims', pendingAuthSchema, { body: { email } })
}

export function sendEmailVerification(): Promise<{ status: 'ok' }> {
  return http.post('/v1/auth/email-verifications', authOkSchema)
}

export function confirmEmailVerification(oob_code: string): Promise<{ status: 'ok' }> {
  return http.post('/v1/auth/email-verification-confirmations', authOkSchema, { body: { oob_code } })
}

export function requestPasswordReset(email: string): Promise<{ status: 'ok' }> {
  return http.post('/v1/auth/password-resets', authOkSchema, { body: { email } })
}

export function confirmPasswordReset(oob_code: string, password: string): Promise<{ status: 'ok' }> {
  return http.post('/v1/auth/password-reset-confirmations', authOkSchema, { body: { oob_code, password } })
}

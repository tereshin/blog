import type { MessageKey } from '@/shared/i18n'
import type { AuthPhase } from './useAuthPanel.ts'

const SUBMIT_KEY: Record<AuthPhase, MessageKey> = {
  sign_in: 'login.submit',
  pending: 'login.submit',
  register: 'login.register_submit',
  reset: 'login.forgot',
  claim: 'login.claim_submit',
}

/** Какие поля и кнопки видны в форме входа для текущей фазы. */
export function authFormView(panel: { phase: AuthPhase; has_password: boolean }, is_unverified: boolean) {
  const phase: AuthPhase = is_unverified && panel.phase === 'sign_in' ? 'claim' : panel.phase
  const has_email = panel.has_password || phase === 'claim' || phase === 'reset'
  return {
    phase,
    has_name: phase === 'register',
    has_email,
    has_password: panel.has_password && (phase === 'sign_in' || phase === 'register'),
    has_submit: has_email,
    has_resend: phase === 'claim',
    has_switches: panel.has_password && phase === 'sign_in',
    has_back: phase === 'register' || phase === 'reset',
    password_autocomplete: phase === 'register' ? 'new-password' : 'current-password',
    submit_key: SUBMIT_KEY[phase],
  }
}

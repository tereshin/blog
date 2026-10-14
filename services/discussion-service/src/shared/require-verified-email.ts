import type { ServiceContext } from '@blog/contracts'

export type VerifiedEmailGate = { allowed: true } | { allowed: false; code: 'email_unverified' }

/** Мутация участника при `email_verified === false` отклоняется. */
export function requireVerifiedEmail(viewer: Pick<ServiceContext, 'email_verified'>): VerifiedEmailGate {
  if (viewer.email_verified === false) return { allowed: false, code: 'email_unverified' }
  return { allowed: true }
}

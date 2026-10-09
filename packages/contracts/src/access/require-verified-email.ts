import type { ServiceContext } from '../http/context.ts'

export type VerifiedEmailGate = { allowed: true } | { allowed: false; code: 'email_unverified' }

/**
 * Мутация участника при `email_verified === false` отклоняется.
 * Гость и чтение публичного этот предикат не вызывают.
 * Ограничение проверяет вызывающий раньше: этот предикат его не подменяет.
 */
export function requireVerifiedEmail(viewer: Pick<ServiceContext, 'email_verified'>): VerifiedEmailGate {
  if (viewer.email_verified === false) return { allowed: false, code: 'email_unverified' }
  return { allowed: true }
}

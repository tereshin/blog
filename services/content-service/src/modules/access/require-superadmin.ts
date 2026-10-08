import type { ServiceContext } from '@blog/contracts'
import { ForbiddenError } from '@blog/errors'

/** Настройки площадки и темы меняет только суперадминистратор. Администратор тем получает отказ. */
export function requireSuperadmin(viewer: ServiceContext): void {
  if (viewer.role !== 'superadmin') {
    throw new ForbiddenError({ message: 'Раздел доступен только администратору площадки' })
  }
}

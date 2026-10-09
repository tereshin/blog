import type { AdminUser } from '@blog/contracts'
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@blog/errors'
import type { ServiceContext } from '@blog/contracts'
import type { AccountRow, UserRepository, UserService } from './user.types.ts'

function requireSuperadmin(viewer: ServiceContext): void {
  if (viewer.user_id === undefined) throw new UnauthorizedError()
  if (viewer.role !== 'superadmin') throw new ForbiddenError()
}

function present(row: AccountRow): AdminUser {
  return {
    id: row.id,
    public_number: row.public_number,
    email: row.email,
    role: row.role,
    can_publish: row.can_publish,
    is_restricted: row.restricted_at !== null,
    created_at: row.created_at.toISOString(),
  }
}

export function createUserService(repository: UserRepository): UserService {
  return {
    async list(viewer, query) {
      requireSuperadmin(viewer)
      const cursor = query.cursor && /^\d+$/.test(query.cursor) ? Number(query.cursor) : 0
      const rows = await repository.search({ q: query.q?.trim() ?? '', cursor, limit: query.limit + 1 })
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return { items: page.map(present), next_cursor: rows.length > query.limit && last ? String(last.public_number) : null }
    },

    async setRole(viewer, id, body, correlation_id) {
      requireSuperadmin(viewer)
      const current = await repository.findById(id)
      if (!current) throw new NotFoundError()
      if (current.role === 'superadmin') throw new ForbiddenError({ message: 'Роль суперадминистратора не меняется' })
      const updated = await repository.setRole({ id, role: body.role, correlation_id })
      if (!updated) throw new NotFoundError()
      return present(updated)
    },

    async setPublishing(viewer, id, body, correlation_id) {
      requireSuperadmin(viewer)
      const updated = await repository.setPublishing({ id, can_publish: body.can_publish, correlation_id })
      if (!updated) throw new NotFoundError()
      return present(updated)
    },

    async restrict(viewer, id, correlation_id) {
      requireSuperadmin(viewer)
      const current = await repository.findById(id)
      if (!current) throw new NotFoundError()
      if (current.role === 'superadmin') throw new ForbiddenError({ message: 'Суперадминистратора ограничить нельзя' })
      const updated = await repository.restrict({ id, correlation_id })
      if (!updated) throw new NotFoundError()
      return present(updated)
    },

    async unrestrict(viewer, id, correlation_id) {
      requireSuperadmin(viewer)
      const updated = await repository.unrestrict({ id, correlation_id })
      if (!updated) throw new NotFoundError()
      if (updated.role === 'superadmin') throw new ForbiddenError()
      return present(updated)
    },

    async setAppearance(viewer, body, correlation_id) {
      if (viewer.user_id === undefined) throw new UnauthorizedError()
      const appearance = await repository.setAppearance({ id: viewer.user_id, appearance: body.appearance, correlation_id })
      if (!appearance) throw new NotFoundError()
      return { appearance }
    },
  }
}

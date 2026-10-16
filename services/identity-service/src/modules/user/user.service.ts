import type {
  AdminUser,
  UpdateAppearance,
  UpdateUserPublishing,
  UpdateUserRole,
} from '@blog/contracts'
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@blog/errors'
import type { ServiceContext } from '@blog/contracts'
import type { AccountRow, UserRepositoryPort } from './user.types.ts'

type UserListInput = {
  q?: string | undefined
  cursor?: string | undefined
  limit: number
  role?: AccountRow['role'] | undefined
  name_ids?: string[] | undefined
  through?: number | undefined
}

function requireSuperadmin(viewer: ServiceContext): void {
  if (viewer.user_id === undefined) throw new UnauthorizedError()
  if (viewer.role !== 'superadmin') throw new ForbiddenError()
}

function present(row: AccountRow): AdminUser {
  return {
    id: row.id,
    public_number: row.public_number,
    email: row.email,
    email_verified: row.email_verified,
    role: row.role,
    can_publish: row.can_publish,
    is_restricted: row.restricted_at !== null,
    created_at: row.created_at.toISOString(),
  }
}

export class UserService {
  constructor(private readonly repository: UserRepositoryPort) {}

  async list(
    viewer: ServiceContext,
    query: UserListInput,
  ): Promise<{ items: AdminUser[]; next_cursor: string | null }> {
    requireSuperadmin(viewer)
    const cursor = query.cursor && /^\d+$/.test(query.cursor) ? Number(query.cursor) : 0
    const rows = await this.repository.search({
      q: query.q?.trim() ?? '',
      cursor,
      limit: query.limit + 1,
      role: query.role,
      name_ids: query.name_ids,
      through: query.through,
    })
    const page = rows.slice(0, query.limit)
    const last = page.at(-1)
    return {
      items: page.map(present),
      next_cursor: rows.length > query.limit && last ? String(last.public_number) : null,
    }
  }

  async remove(viewer: ServiceContext, id: string, correlation_id: string): Promise<void> {
    requireSuperadmin(viewer)
    const current = await this.repository.findById(id)
    if (!current) throw new NotFoundError()
    if (current.role === 'superadmin') throw new ForbiddenError()
    await this.repository.remove({ id, correlation_id })
  }

  async setRole(
    viewer: ServiceContext,
    id: string,
    body: UpdateUserRole,
    correlation_id: string,
  ): Promise<AdminUser> {
    requireSuperadmin(viewer)
    const current = await this.repository.findById(id)
    if (!current) throw new NotFoundError()
    if (current.role === 'superadmin')
      throw new ForbiddenError({ message: 'Роль суперадминистратора не меняется' })
    const updated = await this.repository.setRole({ id, role: body.role, correlation_id })
    if (!updated) throw new NotFoundError()
    return present(updated)
  }

  async setPublishing(
    viewer: ServiceContext,
    id: string,
    body: UpdateUserPublishing,
    correlation_id: string,
  ): Promise<AdminUser> {
    requireSuperadmin(viewer)
    const updated = await this.repository.setPublishing({
      id,
      can_publish: body.can_publish,
      correlation_id,
    })
    if (!updated) throw new NotFoundError()
    return present(updated)
  }

  async restrict(viewer: ServiceContext, id: string, correlation_id: string): Promise<AdminUser> {
    requireSuperadmin(viewer)
    const current = await this.repository.findById(id)
    if (!current) throw new NotFoundError()
    if (current.role === 'superadmin')
      throw new ForbiddenError({ message: 'Суперадминистратора ограничить нельзя' })
    const updated = await this.repository.restrict({ id, correlation_id })
    if (!updated) throw new NotFoundError()
    return present(updated)
  }

  async unrestrict(viewer: ServiceContext, id: string, correlation_id: string): Promise<AdminUser> {
    requireSuperadmin(viewer)
    const updated = await this.repository.unrestrict({ id, correlation_id })
    if (!updated) throw new NotFoundError()
    if (updated.role === 'superadmin') throw new ForbiddenError()
    return present(updated)
  }

  async setAppearance(
    viewer: ServiceContext,
    body: UpdateAppearance,
    correlation_id: string,
  ): Promise<UpdateAppearance> {
    if (viewer.user_id === undefined) throw new UnauthorizedError()
    const saved = await this.repository.setAppearance({
      id: viewer.user_id,
      appearance: body.appearance,
      correlation_id,
    })
    if (!saved) throw new NotFoundError()
    return saved
  }
}

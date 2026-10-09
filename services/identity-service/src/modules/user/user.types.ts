import type { AdminUser, ServiceContext, UpdateAppearance, UpdateUserPublishing, UpdateUserRole } from '@blog/contracts'

export type AccountRow = {
  id: string
  public_number: number
  email: string
  role: 'member' | 'admin' | 'superadmin'
  can_publish: boolean
  restricted_at: Date | null
  created_at: Date
}

export type UserRepository = {
  search: (query: { q: string; cursor: number; limit: number }) => Promise<AccountRow[]>
  findById: (id: string) => Promise<AccountRow | null>
  setRole: (input: { id: string; role: 'member' | 'admin'; correlation_id: string }) => Promise<AccountRow | null>
  setPublishing: (input: { id: string; can_publish: boolean; correlation_id: string }) => Promise<AccountRow | null>
  restrict: (input: { id: string; correlation_id: string }) => Promise<AccountRow | null>
  unrestrict: (input: { id: string; correlation_id: string }) => Promise<AccountRow | null>
  setAppearance: (input: { id: string; appearance: 'light' | 'dark'; correlation_id: string }) => Promise<'light' | 'dark' | null>
}

export type UserService = {
  list: (viewer: ServiceContext, query: { q?: string | undefined; cursor?: string | undefined; limit: number }) => Promise<{ items: AdminUser[]; next_cursor: string | null }>
  setRole: (viewer: ServiceContext, id: string, body: UpdateUserRole, correlation_id: string) => Promise<AdminUser>
  setPublishing: (viewer: ServiceContext, id: string, body: UpdateUserPublishing, correlation_id: string) => Promise<AdminUser>
  restrict: (viewer: ServiceContext, id: string, correlation_id: string) => Promise<AdminUser>
  unrestrict: (viewer: ServiceContext, id: string, correlation_id: string) => Promise<AdminUser>
  setAppearance: (viewer: ServiceContext, body: UpdateAppearance, correlation_id: string) => Promise<UpdateAppearance>
}

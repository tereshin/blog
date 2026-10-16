import type { UpdateAppearance } from '@blog/contracts'

export type AccountRow = {
  id: string
  public_number: number
  email_verified: boolean
  email: string
  role: 'member' | 'admin' | 'superadmin'
  can_publish: boolean
  restricted_at: Date | null
  created_at: Date
}

/** Порт хранилища участников: сервис зависит от него, реализацию подставляет app.ts. */
export type UserRepositoryPort = {
  search: (query: {
    q: string
    cursor: number
    limit: number
    role?: AccountRow['role'] | undefined
    name_ids?: string[] | undefined
    through?: number | undefined
  }) => Promise<AccountRow[]>
  remove: (input: { id: string; correlation_id: string }) => Promise<void>
  findById: (id: string) => Promise<AccountRow | null>
  setRole: (input: {
    id: string
    role: 'member' | 'admin'
    correlation_id: string
  }) => Promise<AccountRow | null>
  setPublishing: (input: {
    id: string
    can_publish: boolean
    correlation_id: string
  }) => Promise<AccountRow | null>
  restrict: (input: { id: string; correlation_id: string }) => Promise<AccountRow | null>
  unrestrict: (input: { id: string; correlation_id: string }) => Promise<AccountRow | null>
  setAppearance: (input: {
    id: string
    appearance: UpdateAppearance['appearance']
    correlation_id: string
  }) => Promise<UpdateAppearance | null>
}

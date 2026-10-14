import type { AdminPage, AdminPagesQuery, BlocksDocument } from '@blog/contracts'
import type { pages } from '../../infra/db/schema.ts'
export type StoredPage = typeof pages.$inferSelect
export type PageWrite = {
  title: string
  slug: string
  blocks: BlocksDocument
  status: 'draft' | 'published'
}
export type PageMutation = {
  actor_id: string
  key: string
  fingerprint: string
  correlation_id: string
}
export type PageRepositoryPort = {
  list: (
    query: AdminPagesQuery,
  ) => Promise<{ rows: Omit<StoredPage, 'blocks'>[]; next_cursor: string | null }>
  find: (id: string) => Promise<StoredPage | null>
  publicPage: (slug: string) => Promise<StoredPage | null>
  published: (cursor?: string, limit?: number) => Promise<StoredPage[]>
  mutate: (
    operation: PageMutation & { id?: string; expected_version?: number; is_delete?: boolean },
    prepare: (current: StoredPage | null) => Promise<PageWrite>,
  ) => Promise<{ status: number; page: AdminPage | null }>
}

import { adminPageSchema, adminPageSummarySchema } from '@blog/contracts'
import type { StoredPage } from './page.types.ts'
export function pageDto(row: StoredPage) {
  return adminPageSchema
    .strip()
    .parse({
      ...row,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      published_at: row.published_at?.toISOString() ?? null,
    })
}
export function pageSummary(row: Omit<StoredPage, 'blocks'>) {
  return adminPageSummarySchema
    .strip()
    .parse({
      ...row,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      published_at: row.published_at?.toISOString() ?? null,
    })
}

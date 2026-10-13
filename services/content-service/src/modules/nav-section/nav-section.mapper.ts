import type { AdminNavSectionItem } from '@blog/contracts'

export type StoredSection = {
  id: string
  title: string
  position: number
}

export type StoredItem = {
  id: string
  section_id: string
  title: string
  icon: string | null
  page_id: string | null
  url: string | null
  position: number
  page_slug: string | null
  page_status: 'draft' | 'published' | 'deleted' | null
}

export type MutationOperation = {
  actor_id: string
  key: string
  fingerprint: string
}

export function toAdminItem(item: StoredItem): AdminNavSectionItem {
  return {
    id: item.id,
    title: item.title,
    icon: item.icon,
    position: item.position,
    target: item.url
      ? { kind: 'url', url: item.url }
      : {
          kind: 'page',
          page_id: item.page_id,
          slug: item.page_slug,
          status: item.page_status,
        },
  }
}

import type { AdminNavSectionItem, CreateNavSectionItem } from '@blog/contracts'
import type { MessageKey } from '@/shared/i18n'

export type ItemDraft = {
  title: string
  icon: string | null
  kind: 'page' | 'url'
  page_id: string
  url: string
}

export function draftFrom(item: AdminNavSectionItem | null): ItemDraft {
  if (!item) return { title: '', icon: null, kind: 'page', page_id: 'unset', url: '' }
  return {
    title: item.title,
    icon: item.icon,
    kind: item.target.kind,
    page_id: item.target.kind === 'page' ? (item.target.page_id ?? 'unset') : 'unset',
    url: item.target.kind === 'url' ? item.target.url : '',
  }
}

export function toBody(draft: ItemDraft): { body: CreateNavSectionItem } | { error: MessageKey } {
  const title = draft.title.trim()
  if (!title) return { error: 'nav.sections.title_required' }
  const icon = draft.icon
  if (draft.kind === 'url') {
    try {
      const url = new URL(draft.url.trim())
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return { error: 'nav.sections.url_invalid' }
      return { body: { title, icon, target: { kind: 'url', url: url.toString() } } }
    } catch {
      return { error: 'nav.sections.url_invalid' }
    }
  }
  if (!draft.page_id || draft.page_id === 'unset') return { error: 'nav.sections.page_required' }
  return { body: { title, icon, target: { kind: 'page', page_id: draft.page_id } } }
}

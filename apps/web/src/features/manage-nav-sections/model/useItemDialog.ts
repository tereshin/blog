import { useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AdminNavSectionItem, CreateNavSectionItem } from '@blog/contracts'
import { listPages, pageKeys } from '@/entities/page'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { draftFrom, toBody } from '../lib/item-draft.ts'
import type { ItemDraft } from '../lib/item-draft.ts'

/** Черновик пункта раздела: поля, список страниц для выбора и проверка перед сохранением. */
export function useItemDialog(item: AdminNavSectionItem | null, onSave: (body: CreateNavSectionItem) => void) {
  const { t } = useT()
  const [draft, setDraft] = useState(() => draftFrom(item))
  const [error, setError] = useState<MessageKey | null>(null)
  const pages = useQuery({
    queryKey: pageKeys.list('nav'),
    queryFn: ({ signal }) => listPages({ limit: 100 }, signal),
  })
  const missing_page_id =
    item?.target.kind === 'page' && item.target.status !== 'published' && item.target.status !== 'draft'
      ? item.target.page_id
      : null
  const page_options = [
    { value: 'unset', label: t('nav.sections.page') },
    ...(missing_page_id ? [{ value: missing_page_id, label: t('nav.sections.page_missing') }] : []),
    ...(pages.data?.items ?? []).map((page) => ({
      value: page.id,
      label: `${page.title} · ${page.status === 'published' ? t('pages.published') : t('pages.draft')}`,
    })),
  ]
  const errorFor = (key: MessageKey) => (error === key ? t(key) : undefined)
  const update = (patch: Partial<ItemDraft>) => setDraft((current) => ({ ...current, ...patch }))

  return {
    draft,
    page_options,
    errorFor,
    setTitle: (title: string) => update({ title }),
    setIcon: (icon: string | null) => {
      if (error === 'nav.sections.icon_invalid') setError(null)
      update({ icon })
    },
    markIconInvalid: () => setError('nav.sections.icon_invalid'),
    setKind: (kind: string) => update({ kind: kind === 'url' ? 'url' : 'page' }),
    setPageId: (page_id: string) => update({ page_id }),
    setUrl: (url: string) => update({ url }),
    handleSubmit: (event: FormEvent) => {
      event.preventDefault()
      const result = toBody(draft)
      if ('error' in result) {
        setError(result.error)
        return
      }
      onSave(result.body)
    },
  }
}

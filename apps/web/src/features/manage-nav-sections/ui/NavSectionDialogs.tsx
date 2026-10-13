import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AdminNavSectionItem, CreateNavSectionItem } from '@blog/contracts'
import { listPages, pageKeys } from '@/entities/page'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { Button, Dialog, FormTextField, Select } from '@/shared/ui'
import { NavIconField } from './NavIconField.tsx'

type ItemDraft = {
  title: string
  icon: string | null
  kind: 'page' | 'url'
  page_id: string
  url: string
}

function draftFrom(item: AdminNavSectionItem | null): ItemDraft {
  if (!item) return { title: '', icon: null, kind: 'page', page_id: 'unset', url: '' }
  return {
    title: item.title,
    icon: item.icon,
    kind: item.target.kind,
    page_id: item.target.kind === 'page' ? (item.target.page_id ?? 'unset') : 'unset',
    url: item.target.kind === 'url' ? item.target.url : '',
  }
}

function toBody(draft: ItemDraft): { body: CreateNavSectionItem } | { error: MessageKey } {
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

type SectionTitleDialogProps = {
  title: string
  heading: MessageKey
  is_pending: boolean
  onClose: () => void
  onSave: (title: string) => void
}

export function SectionTitleDialog({ title, heading, is_pending, onClose, onSave }: SectionTitleDialogProps) {
  const { t } = useT()
  const [value, setValue] = useState(title)
  const [error, setError] = useState<MessageKey | null>(null)
  return (
    <Dialog is_open onOpenChange={(open) => { if (!open) onClose() }}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const next = value.trim()
          if (!next) {
            setError('nav.sections.title_required')
            return
          }
          onSave(next)
        }}
      >
        <Dialog.Header>
          <Dialog.Heading>{t(heading)}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          <FormTextField
            label={t('nav.sections.section_title')}
            value={value}
            maxLength={80}
            error={error ? t(error) : undefined}
            onChange={(event) => setValue(event.target.value)}
          />
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="ghost" onPress={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" isDisabled={is_pending}>{t('common.save')}</Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  )
}

type DeleteSectionDialogProps = {
  title: string
  is_pending: boolean
  onClose: () => void
  onDelete: () => void
}

export function DeleteSectionDialog({ title, is_pending, onClose, onDelete }: DeleteSectionDialogProps) {
  const { t } = useT()
  return (
    <Dialog is_open onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Header>
        <Dialog.Heading>{t('nav.sections.delete_title')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        <p>{title}</p>
        <p>{t('nav.sections.delete_hint')}</p>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="ghost" onPress={onClose}>{t('common.cancel')}</Button>
        <Button isDisabled={is_pending} onPress={onDelete}>{t('common.delete')}</Button>
      </Dialog.Footer>
    </Dialog>
  )
}

type ItemDialogProps = {
  item: AdminNavSectionItem | null
  is_pending: boolean
  onClose: () => void
  onSave: (body: CreateNavSectionItem) => void
}

export function ItemDialog({ item, is_pending, onClose, onSave }: ItemDialogProps) {
  const { t } = useT()
  const [draft, setDraft] = useState(() => draftFrom(item))
  const [error, setError] = useState<MessageKey | null>(null)
  const pages = useQuery({
    queryKey: pageKeys.list('nav'),
    queryFn: ({ signal }) => listPages({ limit: 100 }, signal),
  })
  const page_options = [
    { value: 'unset', label: t('nav.sections.page') },
    ...(item?.target.kind === 'page' && item.target.page_id && item.target.status !== 'published' && item.target.status !== 'draft'
      ? [{ value: item.target.page_id, label: t('nav.sections.page_missing') }]
      : []),
    ...(pages.data?.items ?? []).map((page) => ({
      value: page.id,
      label: `${page.title} · ${page.status === 'published' ? t('pages.published') : t('pages.draft')}`,
    })),
  ]
  return (
    <Dialog is_open onOpenChange={(open) => { if (!open) onClose() }}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const result = toBody(draft)
          if ('error' in result) {
            setError(result.error)
            return
          }
          onSave(result.body)
        }}
      >
        <Dialog.Header>
          <Dialog.Heading>{t(item ? 'nav.sections.edit_item' : 'nav.sections.add_item')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          <div className="flex flex-col gap-4">
          <FormTextField
            label={t('nav.sections.item_title')}
            value={draft.title}
            maxLength={80}
            error={error === 'nav.sections.title_required' ? t(error) : undefined}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <NavIconField
            icon={draft.icon}
            error={error === 'nav.sections.icon_invalid' ? t(error) : undefined}
            onChange={(icon) => {
              if (error === 'nav.sections.icon_invalid') setError(null)
              setDraft({ ...draft, icon })
            }}
            onInvalid={() => setError('nav.sections.icon_invalid')}
          />
          <Select
            label={t('nav.sections.target')}
            value={draft.kind}
            options={[
              { value: 'page', label: t('nav.sections.target_page') },
              { value: 'url', label: t('nav.sections.target_url') },
            ]}
            onChange={(kind) => setDraft({ ...draft, kind: kind === 'url' ? 'url' : 'page' })}
          />
          {draft.kind === 'page' ? (
            <Select
              label={t('nav.sections.page')}
              value={draft.page_id}
              options={page_options}
              error={error === 'nav.sections.page_required' ? t(error) : undefined}
              onChange={(page_id) => setDraft({ ...draft, page_id })}
            />
          ) : (
            <FormTextField
              label={t('nav.sections.url')}
              value={draft.url}
              error={error === 'nav.sections.url_invalid' ? t(error) : undefined}
              onChange={(event) => setDraft({ ...draft, url: event.target.value })}
            />
          )}
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="ghost" onPress={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" isDisabled={is_pending}>{t('common.save')}</Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  )
}

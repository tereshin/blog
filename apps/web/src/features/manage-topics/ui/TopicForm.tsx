import { useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import type { TopicDraft } from '../api/manage-topics.ts'
import { useManageTopics } from '../model/useManageTopics.ts'

type TopicFormProps = {
  upload: (field: 'avatar' | 'cover', onUploaded: (url: string) => void) => ReactNode
}

const FIELD_ERROR: Record<string, MessageKey> = {
  slug_taken: 'admin.topics.slug_taken',
  slug_reserved: 'admin.topics.slug_reserved',
  slug_invalid: 'profile.error.invalid',
}

const field_class = 'rounded-lg border border-separator bg-background px-3 py-2'

const empty: TopicDraft = { title: '', description: '', avatar_url: null, cover_url: null, slug: '' }

export function TopicForm({ upload }: TopicFormProps) {
  const { t } = useT()
  const { create } = useManageTopics()
  const [draft, setDraft] = useState(empty)
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    setError(null)
    create.mutate(
      { ...draft, title: draft.title.trim(), description: draft.description === '' ? null : draft.description, slug: draft.slug.trim() },
      {
        onSuccess: () => setDraft(empty),
        onError: (reason) => {
          const code = reason instanceof ApiError ? reason.code : 'save'
          setError(FIELD_ERROR[code] ? t(FIELD_ERROR[code]) : t('admin.topics.error'))
        },
      },
    )
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <h2 className="text-lg font-semibold">{t('admin.topics.create')}</h2>
      <label className="flex flex-col gap-1 text-sm">
        {t('admin.topics.title')}
        <input required maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={field_class} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t('admin.topics.description')}
        <textarea maxLength={500} value={draft.description ?? ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={`min-h-20 ${field_class}`} />
      </label>
      {upload('avatar', (url) => setDraft((current) => ({ ...current, avatar_url: url })))}
      {upload('cover', (url) => setDraft((current) => ({ ...current, cover_url: url })))}
      <label className="flex flex-col gap-1 text-sm">
        {t('admin.topics.slug')}
        <input required maxLength={40} value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} className={field_class} />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" variant="primary" isDisabled={create.isPending || draft.title.trim().length === 0 || draft.slug.trim().length === 0}>
        {create.isPending ? t('profile.saving') : t('common.save')}
      </Button>
    </form>
  )
}

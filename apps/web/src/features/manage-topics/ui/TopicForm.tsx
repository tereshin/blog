import { FormTextField, FormTextArea } from '@/shared/ui'
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

const empty: TopicDraft = {
  title: '',
  description: '',
  avatar_url: null,
  cover_url: null,
  slug: '',
}

export function TopicForm({ upload }: TopicFormProps) {
  const { t } = useT()
  const { create } = useManageTopics()
  const [draft, setDraft] = useState(empty)
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    if (create.isPending) return
    setError(null)
    create.mutate(
      {
        ...draft,
        title: draft.title.trim(),
        description: draft.description === '' ? null : draft.description,
        slug: draft.slug.trim(),
      },
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
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <h2 className="text-lg font-semibold">{t('admin.topics.create')}</h2>
      <FormTextField
        label={t('admin.topics.title')}
        required
        maxLength={100}
        value={draft.title}
        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
      />
      <FormTextArea
        label={t('admin.topics.description')}
        maxLength={500}
        value={draft.description ?? ''}
        onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        className="min-h-20"
      />
      {upload('avatar', (url) => setDraft((current) => ({ ...current, avatar_url: url })))}
      {upload('cover', (url) => setDraft((current) => ({ ...current, cover_url: url })))}
      <FormTextField
        label={t('admin.topics.slug')}
        required
        maxLength={40}
        value={draft.slug}
        onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        className="self-start"
        isDisabled={
          create.isPending || draft.title.trim().length === 0 || draft.slug.trim().length === 0
        }
      >
        {create.isPending ? t('profile.saving') : t('common.save')}
      </Button>
    </form>
  )
}

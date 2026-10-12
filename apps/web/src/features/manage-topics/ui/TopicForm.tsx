import type { ReactNode } from 'react'
import type { Topic } from '@/entities/topic'
import { useT } from '@/shared/i18n'
import { Button, FormTextArea, FormTextField, SelectField } from '@/shared/ui'
import { useTopicForm } from '../model/useTopicForm.ts'
export type TopicUpload = (
  field: 'avatar' | 'cover',
  onUploaded: (url: string) => void,
) => ReactNode
export function TopicForm({
  initial,
  upload,
  onSaved = () => undefined,
}: {
  initial?: Topic
  upload?: TopicUpload
  onSaved?: (topic: Topic) => void
}) {
  const { t } = useT()
  const { draft, setDraft, error, is_pending, save } = useTopicForm(initial, onSaved)
  return (
    <form
      className="flex min-w-0 flex-col gap-5 p-1"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <fieldset disabled={is_pending} className="flex min-w-0 flex-col gap-5 border-0 p-0">
        <FormTextField
          size="lg"
          variant="secondary"
          label={t('admin.topics.title')}
          required
          maxLength={100}
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
        <FormTextArea
          size="lg"
          variant="secondary"
          label={t('admin.topics.description')}
          maxLength={500}
          value={draft.description ?? ''}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
        <FormTextField
          size="lg"
          variant="secondary"
          label={t('admin.topics.slug')}
          required
          minLength={3}
          maxLength={40}
          pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"
          value={draft.slug}
          onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
        />
        {upload
          ? (['avatar', 'cover'] as const).map((field) => {
              const url = draft[`${field}_url`]
              return (
                <div key={field} className="flex flex-wrap items-center gap-3">
                  {url ? (
                    <img
                      src={url}
                      alt={t(field === 'avatar' ? 'admin.topics.avatar' : 'admin.topics.cover')}
                      className="h-16 max-w-48 rounded-lg object-contain"
                    />
                  ) : null}
                  {upload(field, (url) =>
                    setDraft((current) => ({ ...current, [`${field}_url`]: url })),
                  )}
                  {url ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onPress={() => setDraft({ ...draft, [`${field}_url`]: null })}
                    >
                      {t('common.delete')}
                    </Button>
                  ) : null}
                </div>
              )
            })
          : null}
        {initial ? (
          <SelectField
            label={t('admin.table.status')}
            value={draft.status}
            options={[
              { value: 'active', label: t('admin.topics.active') },
              { value: 'archived', label: t('admin.topics.archived') },
            ]}
            onChange={(status) =>
              setDraft({ ...draft, status: status === 'archived' ? 'archived' : 'active' })
            }
          />
        ) : null}
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        className="self-start"
        isDisabled={is_pending || !draft.title.trim() || !draft.slug.trim()}
      >
        {is_pending ? t('profile.saving') : t('common.save')}
      </Button>
    </form>
  )
}

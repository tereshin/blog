import { useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import type { AdminSettings } from '../api/update-settings.ts'
import { useUpdateSettings } from '../model/useUpdateSettings.ts'

type SettingsFormProps = {
  initial: AdminSettings
  /** Загрузка логотипа приходит слотом: соседний feature отсюда не импортируется. */
  upload: (onUploaded: (url: string) => void) => ReactNode
}

const field_class = 'rounded-lg border border-separator bg-background px-3 py-2'

export function SettingsForm({ initial, upload }: SettingsFormProps) {
  const { t } = useT()
  const update = useUpdateSettings()
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    setError(null)
    update.mutate(
      { ...draft, name: draft.name.trim(), logo_url: draft.logo_url },
      { onError: (reason) => setError(reason instanceof ApiError ? reason.message : t('admin.settings.error')) },
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
      <h1 className="text-xl font-semibold">{t('admin.settings')}</h1>
      <label className="flex flex-col gap-1 text-sm">
        {t('admin.settings.name')}
        <input required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={field_class} />
      </label>
      {upload((url) => setDraft((current) => ({ ...current, logo_url: url })))}
      {draft.logo_url ? <img src={draft.logo_url} alt="" className="h-10 w-auto" /> : null}
      <label className="flex flex-col gap-1 text-sm">
        {t('admin.settings.locale')}
        <select
          value={draft.locale}
          onChange={(event) => setDraft({ ...draft, locale: event.target.value as AdminSettings['locale'] })}
          className={field_class}
        >
          <option value="ru">{t('locale.ru')}</option>
          <option value="en">{t('locale.en')}</option>
          <option value="sr">{t('locale.sr')}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t('admin.settings.about')}
        <textarea value={draft.about} onChange={(event) => setDraft({ ...draft, about: event.target.value })} className={`min-h-32 ${field_class}`} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.registration_open} onChange={(event) => setDraft({ ...draft, registration_open: event.target.checked })} />
        {t('admin.settings.registration_open')}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.new_members_can_publish}
          onChange={(event) => setDraft({ ...draft, new_members_can_publish: event.target.checked })}
        />
        {t('admin.settings.new_members_can_publish')}
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" variant="primary" isDisabled={update.isPending || draft.name.trim().length === 0}>
        {update.isPending ? t('profile.saving') : t('common.save')}
      </Button>
    </form>
  )
}

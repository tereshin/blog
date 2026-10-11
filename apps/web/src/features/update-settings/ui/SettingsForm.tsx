import { seoSettingsSchema, socialCoverSettingsSchema } from '@blog/contracts'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ReactionKind } from '@/entities/reaction'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import type { AdminSettings } from '../api/update-settings.ts'
import { appearanceErrors, appearancePayload, draftsFrom } from '../model/appearance-draft.ts'
import type { AppearanceDraft } from '../model/appearance-draft.ts'
import { useUpdateSettings } from '../model/useUpdateSettings.ts'
import { SettingsSeoFields } from './SettingsSeoFields.tsx'
import { SettingsCoverFields } from './SettingsCoverFields.tsx'
import { SettingsCoverPreview } from './SettingsCoverPreview.tsx'
import { SettingsStatusIcons } from './SettingsStatusIcons.tsx'
import { SettingsReactionFields } from './SettingsReactionFields.tsx'

type UploadSlot = (options: { label: string; onUploaded: (url: string) => void }) => ReactNode

type SettingsFormProps = {
  initial: AdminSettings
  /** Загрузка картинки приходит слотом: соседний feature отсюда не импортируется. */
  upload: UploadSlot
  /** Логотип и вид реакций. У администратора, который не суперадминистратор, оба закрыты. */
  can_edit_media?: boolean
}

const field_class = 'rounded-lg border border-separator bg-background px-3 py-2'

export function SettingsForm({ initial, upload, can_edit_media = true }: SettingsFormProps) {
  const { t } = useT()
  const update = useUpdateSettings()
  const [draft, setDraft] = useState(() => ({ ...initial, seo: seoSettingsSchema.parse(initial.seo ?? {}), social_cover: socialCoverSettingsSchema.parse(initial.social_cover ?? {}) }))
  const [appearance_draft, setAppearanceDraft] = useState(() => draftsFrom(initial.reaction_appearances))
  const [appearance_errors, setAppearanceErrors] = useState<Partial<Record<ReactionKind, 'emoji' | 'image'>>>({})
  const [error, setError] = useState<string | null>(null)

  const patchAppearance = (kind: ReactionKind, patch: Partial<Pick<AppearanceDraft, 'presentation' | 'emoji' | 'image_url'>>) => {
    setAppearanceDraft((current) => current.map((item) => (item.kind === kind ? { ...item, ...patch } : item)))
    setAppearanceErrors((current) => {
      if (current[kind] === undefined) return current
      const next: Partial<Record<ReactionKind, 'emoji' | 'image'>> = {}
      for (const [key, value] of Object.entries(current) as [ReactionKind, 'emoji' | 'image'][]) {
        if (key !== kind) next[key] = value
      }
      return next
    })
  }

  const save = () => {
    setError(null)
    const field_errors = can_edit_media ? appearanceErrors(appearance_draft) : {}
    setAppearanceErrors(field_errors)
    if (Object.keys(field_errors).length > 0) return
    const reaction_appearances = can_edit_media ? appearancePayload(appearance_draft) : initial.reaction_appearances
    const profile_status_icons = can_edit_media ? draft.profile_status_icons : initial.profile_status_icons
    const logo_url = can_edit_media ? draft.logo_url : initial.logo_url
    const parsed = seoSettingsSchema.safeParse(draft.seo)
    if (!parsed.success) { setError(t('seo.validation_error')); return }
    update.mutate(
      { ...draft, name: draft.name.trim(), logo_url, reaction_appearances, profile_status_icons },
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
      {can_edit_media ? (
        upload({ label: t('admin.settings.logo'), onUploaded: (url) => setDraft((current) => ({ ...current, logo_url: url })) })
      ) : (
        <Button type="button" isDisabled>
          {t('admin.settings.logo')}
        </Button>
      )}
      {draft.logo_url ? <img src={draft.logo_url} alt="" className="h-10 w-auto" /> : null}
      <SettingsReactionFields
        drafts={appearance_draft}
        can_edit_media={can_edit_media}
        errors={appearance_errors}
        upload={upload}
        onPatch={patchAppearance}
      />
      <SettingsStatusIcons
        icons={draft.profile_status_icons}
        can_edit_media={can_edit_media}
        upload={upload}
        onChange={(transform) => setDraft((current) => ({ ...current, profile_status_icons: transform(current.profile_status_icons) }))}
      />
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
      <SettingsSeoFields value={draft.seo} public_origin={draft.public_origin} onChange={(seo) => setDraft((current) => ({ ...current, seo }))} upload={upload} can_edit_media={can_edit_media} />
      <SettingsCoverFields value={draft.social_cover} onChange={(social_cover) => setDraft((current) => ({ ...current, social_cover }))} upload={upload} can_edit_media={can_edit_media} />
      <SettingsCoverPreview settings={draft.social_cover} site_name={draft.name} site_logo={draft.logo_url} upload={upload} can_edit_media={can_edit_media} />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" variant="primary" isDisabled={update.isPending || draft.name.trim().length === 0}>
        {update.isPending ? t('profile.saving') : t('common.save')}
      </Button>
    </form>
  )
}

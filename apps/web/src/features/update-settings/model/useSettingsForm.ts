import {
  faviconSettingsSchema,
  seoSettingsSchema,
  socialCoverSettingsSchema,
} from '@blog/contracts'
import { useState } from 'react'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'
import type { AdminSettings } from '../api/update-settings.ts'
import {
  appendDraft,
  appearanceErrors,
  appearancePayload,
  draftsFrom,
  moveActive,
  restoreDraft,
  retireDraft,
} from './appearance-draft.ts'
import type { AppearanceDraft, AppearanceFieldError } from './appearance-draft.ts'
import type { SettingsSection } from './settings-sections.ts'
import { useUpdateSettings } from './useUpdateSettings.ts'

export function useSettingsForm(
  initial: AdminSettings,
  section: SettingsSection,
  can_edit_media: boolean,
) {
  const { t } = useT()
  const toast = useToast()
  const update = useUpdateSettings()
  const [draft, setDraft] = useState(() => ({
    ...initial,
    favicon: faviconSettingsSchema.parse(initial.favicon ?? {}),
    seo: seoSettingsSchema.parse(initial.seo ?? {}),
    social_cover: socialCoverSettingsSchema.parse(initial.social_cover ?? {}),
  }))
  const [appearance_draft, setAppearanceDraft] = useState(() =>
    draftsFrom(initial.reaction_appearances),
  )
  const [appearance_errors, setAppearanceErrors] = useState<
    Partial<Record<string, AppearanceFieldError>>
  >({})
  const [error, setError] = useState<string | null>(null)

  const clearAppearanceError = (kind: string) => {
    setAppearanceErrors((current) => {
      if (current[kind] === undefined) return current
      const next: Partial<Record<string, AppearanceFieldError>> = {}
      for (const [key, value] of Object.entries(current)) {
        if (key !== kind && value) next[key] = value
      }
      return next
    })
  }

  const patchAppearance = (
    kind: string,
    patch: Partial<Pick<AppearanceDraft, 'presentation' | 'emoji' | 'image_url' | 'label'>>,
  ) => {
    setAppearanceDraft((current) =>
      current.map((item) => (item.kind === kind ? { ...item, ...patch } : item)),
    )
    clearAppearanceError(kind)
  }

  const reorderAppearances = (from_kind: string, to_kind: string) => {
    setAppearanceDraft((current) => moveActive(current, from_kind, to_kind))
  }

  const retireAppearance = (kind: string) => {
    setAppearanceDraft((current) => retireDraft(current, kind))
    clearAppearanceError(kind)
  }

  const restoreAppearance = (kind: string) => {
    setAppearanceDraft((current) => restoreDraft(current, kind))
  }

  const addAppearance = (draft: AppearanceDraft) => {
    setAppearanceDraft((current) => appendDraft(current, draft))
  }

  const save = () => {
    if (update.isPending) return
    setError(null)
    const field_errors = can_edit_media ? appearanceErrors(appearance_draft) : {}
    setAppearanceErrors(field_errors)
    if (section === 'reactions' && Object.keys(field_errors).length > 0) return
    const reaction_appearances =
      section === 'reactions' && can_edit_media
        ? appearancePayload(appearance_draft)
        : initial.reaction_appearances
    const profile_status_icons = can_edit_media
      ? draft.profile_status_icons
      : initial.profile_status_icons
    const logo_url = can_edit_media ? draft.logo_url : initial.logo_url
    const parsed = seoSettingsSchema.safeParse(draft.seo)
    if ((section === 'seo' || section === 'publisher') && !parsed.success) {
      setError(t('seo.validation_error'))
      return
    }
    update.mutate(
      {
        section,
        settings: {
          ...draft,
          name: draft.name.trim(),
          logo_url,
          logo_dark_url: can_edit_media ? draft.logo_dark_url : initial.logo_dark_url,
          favicon: can_edit_media ? draft.favicon : initial.favicon,
          reaction_appearances,
          profile_status_icons,
        },
      },
      {
        onSuccess: () => toast.success(t('admin.settings.saved')),
        onError: (reason) =>
          setError(reason instanceof ApiError ? reason.message : t('admin.settings.error')),
      },
    )
  }

  return {
    draft,
    setDraft,
    appearance_draft,
    appearance_errors,
    error,
    patchAppearance,
    reorderAppearances,
    retireAppearance,
    restoreAppearance,
    addAppearance,
    save,
    is_pending: update.isPending,
  }
}

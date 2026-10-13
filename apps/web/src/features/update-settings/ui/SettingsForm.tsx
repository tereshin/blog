import { ADMIN_ROUTES } from '@/entities/admin'
import type { FaviconVariant } from '@blog/contracts'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button, PageCard, ToggleField } from '@/shared/ui'
import type { AdminSettings } from '../api/update-settings.ts'
import type { SettingsSection } from '../model/settings-sections.ts'
import { useSettingsForm } from '../model/useSettingsForm.ts'
import { SettingsGeneralFields } from './SettingsGeneralFields.tsx'
import { SettingsSeoFields } from './SettingsSeoFields.tsx'
import { SettingsPublisherFields } from './SettingsPublisherFields.tsx'
import { SettingsCoverFields } from './SettingsCoverFields.tsx'
import { SettingsCoverPreview } from './SettingsCoverPreview.tsx'
import { SettingsStatusIcons } from './SettingsStatusIcons.tsx'
import { SettingsReactionFields } from './SettingsReactionFields.tsx'
import { SettingsShellFields } from './SettingsShellFields.tsx'

type UploadSlot = (options: {
  label: string
  variant?: FaviconVariant
  onUploaded: (url: string) => void
  children?: ReactNode
  isIconOnly?: boolean
  is_disabled?: boolean
}) => ReactNode
type SettingsFormProps = {
  initial: AdminSettings
  section: SettingsSection
  upload: UploadSlot
  can_edit_media?: boolean
}

export function SettingsForm({
  initial,
  section,
  upload,
  can_edit_media = true,
}: SettingsFormProps) {
  const { t } = useT()
  const {
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
    is_pending,
  } = useSettingsForm(initial, section, can_edit_media)
  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <PageCard>
        <PageCard.Header
          title={t(ADMIN_ROUTES[section].title)}
          actions={
            section === 'status-icons' && can_edit_media && draft.profile_status_icons.length < 100
              ? upload({
                  label: t('admin.settings.status_add'),
                  children: <BaseIcon name="add" style="line" />,
                  isIconOnly: true,
                  is_disabled: is_pending,
                  onUploaded: (image_url) =>
                    setDraft((current) => ({
                      ...current,
                      profile_status_icons:
                        current.profile_status_icons.length < 100
                          ? [
                              ...current.profile_status_icons,
                              { id: crypto.randomUUID(), label: t('profile.status'), image_url },
                            ]
                          : current.profile_status_icons,
                    })),
                })
              : null
          }
        />
        <PageCard.Content>
          <fieldset disabled={is_pending} className="flex min-w-0 flex-col gap-8 border-0 p-0">
            {section === 'general' ? (
              <SettingsGeneralFields
                value={draft}
                onChange={(value) => setDraft((current) => ({ ...current, ...value }))}
                can_edit_media={can_edit_media}
                upload={upload}
              />
            ) : null}
            {section === 'access' ? (
              <>
                <ToggleField
                  label={t('admin.settings.registration_open')}
                  isSelected={draft.registration_open}
                  onChange={(registration_open) => setDraft({ ...draft, registration_open })}
                />
                <ToggleField
                  label={t('admin.settings.new_members_can_publish')}
                  isSelected={draft.new_members_can_publish}
                  onChange={(new_members_can_publish) =>
                    setDraft({ ...draft, new_members_can_publish })
                  }
                />
              </>
            ) : null}
            {section === 'layout' ? (
              <SettingsShellFields
                value={draft.shell}
                onChange={(shell) => setDraft({ ...draft, shell })}
              />
            ) : null}
            {section === 'reactions' ? (
              <SettingsReactionFields
                drafts={appearance_draft}
                errors={appearance_errors}
                can_edit_media={can_edit_media}
                upload={upload}
                onPatch={patchAppearance}
                onReorder={reorderAppearances}
                onRetire={retireAppearance}
                onRestore={restoreAppearance}
                onAdd={addAppearance}
              />
            ) : null}
            {section === 'status-icons' ? (
              <SettingsStatusIcons
                icons={draft.profile_status_icons}
                can_edit_media={can_edit_media}
                upload={upload}
                onChange={(transform) =>
                  setDraft((current) => ({
                    ...current,
                    profile_status_icons: transform(current.profile_status_icons),
                  }))
                }
              />
            ) : null}
            {section === 'seo' ? (
              <SettingsSeoFields
                value={draft.seo}
                public_origin={draft.public_origin}
                onChange={(seo) => setDraft({ ...draft, seo })}
              />
            ) : null}
            {section === 'publisher' ? (
              <SettingsPublisherFields
                value={draft.seo.publisher}
                onChange={(publisher) => setDraft({ ...draft, seo: { ...draft.seo, publisher } })}
                upload={upload}
                can_edit_media={can_edit_media}
              />
            ) : null}
            {section === 'covers' ? (
              <>
                <SettingsCoverFields
                  value={draft.social_cover}
                  onChange={(social_cover) => setDraft({ ...draft, social_cover })}
                  upload={upload}
                  can_edit_media={can_edit_media}
                />
                <SettingsCoverPreview
                  settings={draft.social_cover}
                  site_name={draft.name}
                  site_logo={draft.logo_url}
                  upload={upload}
                  can_edit_media={can_edit_media}
                />
              </>
            ) : null}
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
        </PageCard.Content>
        <PageCard.Footer>
          <Button
            type="submit"
            variant="primary"
            className="self-start"
            isDisabled={is_pending || draft.name.trim().length === 0}
          >
            {is_pending ? t('profile.saving') : t('common.save')}
          </Button>
        </PageCard.Footer>
      </PageCard>
    </form>
  )
}

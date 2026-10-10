import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Profile } from '@/entities/profile'
import { EditProfileDialog } from '@/features/edit-profile'
import { ImageUploadButton } from '@/features/upload-media'
import { useT } from '@/shared/i18n'
import { Button, BaseIcon } from '@/shared/ui'
import { SettingsDialog } from './SettingsDialog.tsx'

type OwnerActionsProps = { profile: Profile; theme?: ReactNode }

/** Кнопки своего профиля: правка и настройки. */
export function OwnerActions({ profile, theme }: OwnerActionsProps) {
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const [settings, setSettings] = useState(false)
  const draft = {
    display_name: profile.display_name,
    bio: profile.bio ?? '',
    avatar_url: profile.avatar_url,
    cover_url: profile.cover_url,
    slug: profile.slug ?? '',
    saved_slug: profile.slug ?? '',
  }

  return (
    <>
      <Button variant="secondary" onPress={() => setEditing(true)}>
        {t('profile.edit')}
      </Button>
      <Button
        variant="secondary"
        isIconOnly
        aria-label={t('profile.settings')}
        onPress={() => setSettings(true)}
      >
        <BaseIcon name="settings_1" style="line" />
      </Button>
      <EditProfileDialog
        is_open={editing}
        onOpenChange={setEditing}
        initial={draft}
        upload={(field, onUploaded) => (
          <ImageUploadButton
            label={t(field === 'avatar' ? 'profile.avatar' : 'profile.cover')}
            onUploaded={onUploaded}
          />
        )}
      />
      <SettingsDialog
        is_open={settings}
        onOpenChange={setSettings}
        profile={profile}
        theme={theme}
      />
    </>
  )
}

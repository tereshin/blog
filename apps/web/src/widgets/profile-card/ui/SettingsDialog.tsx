import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Profile } from '@/entities/profile'
import { AppearanceToggle } from '@/features/toggle-appearance'
import { useUpdateProfile } from '@/features/edit-profile'
import { useLogout } from '@/features/logout'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { Button, Dialog } from '@/shared/ui'

type SettingsDialogProps = {
  is_open: boolean
  onOpenChange: (is_open: boolean) => void
  profile: Profile
  theme?: ReactNode
}

const FIELD_ERROR: Record<string, MessageKey> = {
  slug_taken: 'profile.error.slug_taken',
  slug_reserved: 'profile.error.slug_reserved',
  validation_failed: 'profile.error.invalid',
}

export function SettingsDialog({ is_open, onOpenChange, profile, theme }: SettingsDialogProps) {
  const { t } = useT()
  const update = useUpdateProfile()
  const logout = useLogout()
  const [slug, setSlug] = useState(profile.slug ?? '')
  const [error, setError] = useState<string | null>(null)
  const message = error && FIELD_ERROR[error] ? t(FIELD_ERROR[error]) : error ? t('profile.error.save') : null

  const save = () => {
    setError(null)
    update.mutate(
      {
        display_name: profile.display_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        cover_url: profile.cover_url,
        slug: slug.trim().length > 0 ? slug.trim() : null,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (failure) => setError(failure instanceof ApiError ? failure.code : 'save'),
      },
    )
  }

  return (
    <Dialog is_open={is_open} onOpenChange={onOpenChange} size="sm">
      <Dialog.CloseTrigger />
      <Dialog.Header>
        <Dialog.Heading>{t('profile.settings_title')}</Dialog.Heading>
      </Dialog.Header>
      <Dialog.Body>
        <div className="flex flex-col gap-3">
          <AppearanceToggle />
          {theme}
          <Link to="/about" className="text-sm text-accent outline-offset-2 hover:underline">
            {t('account.about')}
          </Link>
          <label className="flex flex-col gap-1 text-sm">
            {t('profile.slug')}
            <input value={slug} maxLength={40} onChange={(event) => setSlug(event.target.value)} className="rounded-lg border border-separator bg-background px-3 py-2" />
            {profile.slug ? <span className="text-muted">{t('profile.slug_current', { slug: profile.slug })}</span> : null}
            {message ? <span className="text-danger">{message}</span> : null}
          </label>
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="primary" onPress={save} isDisabled={update.isPending}>
          {t('profile.save')}
        </Button>
        <Button variant="danger" onPress={() => void logout()}>
          {t('account.logout')}
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useViewer } from '@/entities/session'
import { AppearanceToggle } from '@/features/toggle-appearance'
import { EditProfileDialog } from '@/features/edit-profile'
import { useLoginDialog } from '@/features/login'
import { LogoutMenuItem } from '@/features/logout'
import { ImageUploadButton } from '@/features/upload-media'
import { useT } from '@/shared/i18n'
import { Avatar, Button, ChevronDownIcon, Menu } from '@/shared/ui'

/** Меню аватара. Гость видит «Войти». Переключатель вида подключится в US16 через слот `theme`. */
export function AccountMenu({ theme }: { theme?: ReactNode }) {
  const { t } = useT()
  const { viewer } = useViewer()
  const openLogin = useLoginDialog((state) => state.open)
  const navigate = useNavigate()
  const [is_editing, setEditing] = useState(false)

  if (viewer.status !== 'member') {
    if (viewer.status === 'loading') return null
    return (
      <div className="flex items-center gap-2">
        <AppearanceToggle />
        {theme}
        <Button variant="secondary" shape="pill" onPress={() => openLogin('required')}>
          {t('header.sign_in')}
        </Button>
      </div>
    )
  }

  const address = viewer.profile.slug || String(viewer.user.public_number)
  const draft = {
    display_name: viewer.profile.display_name,
    bio: '',
    avatar_url: viewer.profile.avatar_url,
    cover_url: null,
    slug: viewer.profile.slug,
    saved_slug: viewer.profile.slug,
  }

  return (
    <>
      <Menu>
        <Button variant="ghost" shape="pill" aria-label={t('header.account_menu')} className="gap-1 px-1">
          <Avatar src={viewer.profile.avatar_url} name={viewer.profile.display_name} size="sm" />
          <ChevronDownIcon width={16} height={16} />
        </Button>
        <Menu.Content>
          <Menu.Item isDisabled>{viewer.profile.display_name}</Menu.Item>
          <Menu.Item onPress={() => navigate(`/u/${address}`)}>{t('account.my_profile')}</Menu.Item>
          <Menu.Item onPress={() => navigate('/bookmarks')}>{t('account.bookmarks')}</Menu.Item>
          <Menu.Item onPress={() => setEditing(true)}>{t('account.edit_profile')}</Menu.Item>
          {viewer.user.email_verified ? null : <Menu.Item onPress={() => openLogin('required')}>{t('login.confirm_email')}</Menu.Item>}
          <AppearanceToggle as="item" />
          {theme}
          <Menu.Item onPress={() => navigate('/about')}>{t('account.about')}</Menu.Item>
          <LogoutMenuItem />
        </Menu.Content>
      </Menu>
      <EditProfileDialog
        is_open={is_editing}
        onOpenChange={setEditing}
        initial={draft}
        upload={(field, onUploaded) => (
          <ImageUploadButton label={t(field === 'avatar' ? 'profile.avatar' : 'profile.cover')} onUploaded={onUploaded} />
        )}
      />
    </>
  )
}

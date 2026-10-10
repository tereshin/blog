import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useProfile } from '@/entities/profile'
import { useViewer } from '@/entities/session'
import { AppearanceToggle } from '@/features/toggle-appearance'
import { EditProfileDialog } from '@/features/edit-profile'
import { useLoginDialog } from '@/features/login'
import { LogoutMenuItem } from '@/features/logout'
import { useT } from '@/shared/i18n'
import { Avatar, Button, ChevronDownIcon, Menu } from '@/shared/ui'

/** Меню аватара. Гость видит «Войти». Переключатель вида подключится в US16 через слот `theme`. */
export function AccountMenu({ theme }: { theme?: ReactNode }) {
  const { t } = useT()
  const { viewer } = useViewer()
  const openLogin = useLoginDialog((state) => state.open)
  const navigate = useNavigate()
  const [is_editing, setEditing] = useState(false)
  const address = viewer.status === 'member' ? viewer.profile.slug || String(viewer.user.public_number) : undefined
  const { data: profile } = useProfile(is_editing ? address : undefined)

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
      {is_editing && profile ? (
        <EditProfileDialog
          is_open={is_editing}
          onOpenChange={setEditing}
          initial={{ display_name: profile.display_name, bio: profile.bio ?? '', slug: profile.slug ?? '' }}
        />
      ) : null}
    </>
  )
}

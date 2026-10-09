import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSettings } from '@/entities/settings'
import { useViewer } from '@/entities/session'
import { useLoginDialog } from '@/features/login'
import { useT } from '@/shared/i18n'
import { Avatar, Button, ChevronDownIcon, MenuIcon, PenIcon, SearchIcon, useToast } from '@/shared/ui'
import { useShellStore } from '../model/useShellStore.ts'

type SiteHeaderProps = {
  /** Центр шапки: пилюля с первой карточкой, поле поиска или «назад» (`HeaderCenter`). */
  center?: ReactNode
  /** Колокольчик уведомлений (появляется вместе со сценарием уведомлений). */
  notifications?: ReactNode
  onSearch?: () => void
  /** Поведение «Написать», если у участника уже есть право публиковать. */
  onWrite?: () => void
  /** Меню учётной записи вместо значка аватара. */
  account?: ReactNode
}

/**
 * Шапка на всю ширину вне прокрутки. Слева — кнопка панели (только ниже 1200px) и название площадки;
 * справа слева направо: поиск, колокольчик, «Написать», учётная запись или «Войти».
 */
export function SiteHeader({ center, notifications, onSearch, onWrite, account }: SiteHeaderProps) {
  const { t } = useT()
  const { data: settings } = useSettings()
  const { viewer } = useViewer()
  const openLogin = useLoginDialog((state) => state.open)
  const toast = useToast()
  const navigate = useNavigate()
  const setNavOpen = useShellStore((state) => state.setNavOpen)

  const handleWrite = () => {
    if (viewer.status === 'loading') return
    if (viewer.status !== 'member') {
      openLogin('required')
      return
    }
    if (viewer.user.is_restricted) {
      toast.error(t('error.restricted'))
      return
    }
    if (!viewer.user.can_publish) {
      toast.error(t('editor.cannot_publish'))
      return
    }
    if (onWrite) {
      onWrite()
      return
    }
    navigate('/write')
  }

  const brand = settings?.name || t('common.site_name_fallback')

  return (
    <div className="flex h-14 items-center gap-2 border-b border-separator bg-background px-4">
      <Button
        variant="ghost"
        isIconOnly
        aria-label={t('shell.nav.open')}
        className="min-[1200px]:hidden"
        onPress={() => setNavOpen(true)}
      >
        <MenuIcon />
      </Button>
      <Link to="/" className="shrink-0 rounded-md text-lg font-semibold text-foreground outline-offset-4">
        {settings?.logo_url ? <img src={settings.logo_url} alt={brand} className="h-8 w-auto" /> : brand}
      </Link>
      <div className="flex min-w-0 flex-1 justify-center px-2">{center}</div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" isIconOnly aria-label={t('header.search')} onPress={onSearch}>
          <SearchIcon />
        </Button>
        {notifications}
        <Button variant="primary" shape="pill" onPress={handleWrite}>
          <PenIcon width={16} height={16} />
          <span className="max-[520px]:sr-only">{t('header.write')}</span>
        </Button>
        {account ??
          (viewer.status === 'member' ? (
            <Button variant="ghost" shape="pill" aria-label={t('header.account_menu')} className="gap-1 px-1">
              <Avatar src={viewer.profile.avatar_url} name={viewer.profile.display_name} size="sm" />
              <ChevronDownIcon width={16} height={16} />
            </Button>
          ) : viewer.status === 'guest' ? (
            <Button variant="secondary" shape="pill" onPress={() => openLogin('required')}>
              {t('header.sign_in')}
            </Button>
          ) : null)}
      </div>
    </div>
  )
}

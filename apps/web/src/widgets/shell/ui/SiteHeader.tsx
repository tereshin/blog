import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useSettings } from '@/entities/settings'
import { useViewer } from '@/entities/session'
import { useLoginDialog } from '@/features/login'
import { useT } from '@/shared/i18n'
import {
  Avatar,
  Button,
  ChevronDownIcon,
  MenuIcon,
  PenIcon,
  SearchIcon,
  useToast,
} from '@/shared/ui'
import { useShellStore } from '../model/useShellStore.ts'
import { HeaderSearch } from './HeaderSearch.tsx'

type SiteHeaderProps = {
  /** Центр шапки: поле поиска, «назад» или пусто (`HeaderCenter`). */
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
 * Шапка на всю ширину вне прокрутки. Слева — кнопка панели (только ниже 768px) и название площадки;
 * справа слева направо: поиск, колокольчик, «Написать», учётная запись или «Войти».
 */
export function SiteHeader({ center, notifications, onSearch, onWrite, account }: SiteHeaderProps) {
  const { t } = useT()
  const { data: settings } = useSettings()
  const { viewer } = useViewer()
  const openLogin = useLoginDialog((state) => state.open)
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const is_nav_open = useShellStore((state) => state.is_nav_open)
  const setNavOpen = useShellStore((state) => state.setNavOpen)
  const openSearch = useShellStore((state) => state.openSearch)
  const closeSearch = useShellStore((state) => state.closeSearch)
  const is_search_open = useShellStore((state) => state.header_center.kind === 'search')

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
    if (!viewer.user.email_verified) {
      toast.error(t('login.email_unverified'))
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
    closeSearch()
    navigate('/write', { state: { editor_return_to: location.pathname + location.search + location.hash } })
  }

  const brand = settings?.name || t('common.site_name_fallback')

  return (
    <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-1 px-2 sm:gap-2 sm:px-4 [&_.button--icon-only]:max-sm:size-9 [&_.button--icon-only]:max-sm:min-w-9">
      <Button
        variant="ghost"
        isIconOnly
        aria-label={t('shell.nav.open')}
        aria-controls="shell-nav"
        aria-expanded={is_nav_open}
        className="min-[768px]:hidden"
        onPress={() => setNavOpen(true)}
      >
        <MenuIcon />
      </Button>
      <Link
        to="/"
        className="shrink-0 rounded-md text-lg font-semibold text-foreground outline-offset-4"
      >
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt={brand} className="h-8 w-auto" />
        ) : (
          brand
        )}
      </Link>
      <div className="flex min-w-0 flex-1 items-center sm:px-2">{center}</div>
      <div className="flex shrink-0 items-center sm:gap-1">
        <Button
          variant="ghost"
          isIconOnly
          aria-label={t('header.search')}
          aria-haspopup="dialog"
          aria-expanded={is_search_open}
          onPress={onSearch ?? openSearch}
        >
          <SearchIcon />
        </Button>
        {notifications}
        <Button
          variant="secondary"
          shape="pill"
          className="max-sm:size-9 max-sm:min-w-9 max-sm:p-0"
          aria-label={t('header.write')}
          onPress={handleWrite}
        >
          <PenIcon width={16} height={16} />
          <span className="max-[767px]:sr-only">{t('header.write')}</span>
        </Button>
        {account ??
          (viewer.status === 'member' ? (
            <Button
              variant="ghost"
              shape="pill"
              aria-label={t('header.account_menu')}
              className="gap-1 px-1"
            >
              <Avatar
                src={viewer.profile.avatar_url}
                name={viewer.profile.display_name}
                size="sm"
              />
              <ChevronDownIcon width={16} height={16} />
            </Button>
          ) : viewer.status === 'guest' ? (
            <Button variant="secondary" shape="pill" onPress={() => openLogin('required')}>
              {t('header.sign_in')}
            </Button>
          ) : null)}
      </div>
      {is_search_open ? <HeaderSearch /> : null}
    </div>
  )
}

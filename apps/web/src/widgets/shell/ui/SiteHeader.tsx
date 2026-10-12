import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useMessagesUnreadCount } from '@/entities/conversation'
import { useSettings } from '@/entities/settings'
import { useViewer } from '@/entities/session'
import { useT } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { Button, MenuIcon, PenIcon, SearchIcon } from '@/shared/ui'
import { useCurrentSection } from '../model/useCurrentSection.ts'
import { useShellStore } from '../model/useShellStore.ts'
import { useWriteAction } from '../model/useWriteAction.ts'
import { AccountMenu } from './AccountMenu.tsx'
import { HeaderBackLink } from './HeaderBackLink.tsx'
import { HeaderSearch } from './HeaderSearch.tsx'
import { HeaderTab } from './HeaderTab.tsx'

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

const HOME_SECTIONS = new Set(['fresh', 'popular', 'my_feed', 'topic'])

/**
 * Шапка на всю ширину вне прокрутки. От 768px: слева название площадки,
 * справа слева направо — поиск, колокольчик, «Написать», учётная запись или «Войти».
 * Ниже 768px: сверху кнопка панели (на статье — «Назад») и название по центру;
 * действия становятся плавающей панелью внизу экрана (главная, поиск, колокольчик, сообщения, учётная запись),
 * «Написать» — круглой кнопкой над ней (кроме статьи и сообщений, где внизу поле ввода).
 * Раскладку переключает CSS (`site-header-*` в globals.css).
 */
export function SiteHeader({ center, notifications, onSearch, onWrite, account }: SiteHeaderProps) {
  const { t } = useT()
  const { data: settings } = useSettings()
  const { viewer } = useViewer()
  const unread_messages = useMessagesUnreadCount(viewer.status === 'member')
  const { section } = useCurrentSection()
  const is_nav_open = useShellStore((state) => state.is_nav_open)
  const setNavOpen = useShellStore((state) => state.setNavOpen)
  const openSearch = useShellStore((state) => state.openSearch)
  const is_search_open = useShellStore((state) => state.header_center.kind === 'search')
  const has_back = useShellStore(
    (state) => (state.header_center.kind === 'search' ? state.previous_center : state.header_center).kind === 'back',
  )
  const handleWrite = useWriteAction(onWrite)

  const brand = settings?.name || t('common.site_name_fallback')

  return (
    <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-1 px-2 sm:gap-2 sm:px-4">
      {has_back ? (
        <HeaderBackLink className="size-10 min-[768px]:hidden" />
      ) : (
        <Button
          variant="ghost"
          isIconOnly
          aria-label={t('shell.nav.open')}
          aria-controls="shell-nav"
          aria-expanded={is_nav_open}
          className="size-10 min-w-10 min-[768px]:hidden"
          onPress={() => setNavOpen(true)}
        >
          <MenuIcon className="size-6" />
        </Button>
      )}
      <div className="lg:min-w-[200px]">
        <Link
          to="/"
          className="shrink-0 rounded-md text-lg font-semibold text-foreground outline-offset-4 max-[767px]:absolute max-[767px]:top-2 max-[767px]:left-1/2 max-[767px]:-translate-x-1/2"
        >
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={brand} className="h-10 w-auto" />
          ) : (
            brand
          )}
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 items-center sm:px-2 max-[767px]:hidden max-w-[640px] mx-auto">{center}</div>
      <div className="site-header-actions flex shrink-0 items-center sm:gap-3">
        <HeaderTab
          to="/"
          label={t('shell.nav.home')}
          icon="home"
          is_selected={HOME_SECTIONS.has(section.kind)}
        />
        <Button
          variant="ghost"
          isIconOnly
          size="lg"
          aria-label={t('header.search')}
          aria-haspopup="dialog"
          aria-expanded={is_search_open}
          onPress={onSearch ?? openSearch}
        >
          <SearchIcon className="size-6" />
        </Button>
        {notifications}
        <HeaderTab
          to="/messages"
          label={t('shell.nav.messages')}
          icon="messages"
          is_selected={section.kind === 'messages'}
          has_unread={(unread_messages.data ?? 0) > 0}
          unread_label={t('shell.nav.unread')}
        />
        <Button
          variant="tertiary"
          shape="pill"
          size="lg"
          className={cn('site-header-write', (has_back || section.kind === 'messages') && 'max-[767px]:hidden')}
          aria-label={t('header.write')}
          onPress={handleWrite}
        >
          <PenIcon className="size-6" />
          <span className="max-[767px]:sr-only">{t('header.write')}</span>
        </Button>
        {account ?? <AccountMenu />}
      </div>
      {is_search_open ? <HeaderSearch /> : null}
    </div>
  )
}

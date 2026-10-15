import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import { BaseIcon, SearchIcon } from '@/shared/ui'
import { AccountMenu } from './AccountMenu.tsx'
import { HeaderTab } from './HeaderTab.tsx'

type MobileNavigationProps = {
  section_kind: string
  notifications: ReactNode
  has_unread_messages: boolean
}

const HOME_SECTIONS = new Set(['fresh', 'popular', 'my_feed', 'topic'])

export function MobileNavigation({
  section_kind,
  notifications,
  has_unread_messages,
}: MobileNavigationProps) {
  const { t } = useT()
  return (
    <nav aria-label={t('shell.mobile_navigation')} className="mobile-navigation flex items-center">
      <HeaderTab
        to="/"
        label={t('shell.nav.home')}
        icon="home"
        is_selected={HOME_SECTIONS.has(section_kind)}
      />
      <Link
        to="/discovery"
        aria-label={t('discovery.title')}
        aria-current={section_kind === 'discovery' ? 'page' : undefined}
        className="mobile-navigation-link inline-flex items-center justify-center rounded-pill text-foreground outline-offset-2 hover:bg-surface-secondary aria-[current=page]:text-accent"
      >
        <SearchIcon className="size-7" />
      </Link>
      {notifications}
      <HeaderTab
        to="/messages"
        label={t('shell.nav.messages')}
        icon="chat_3"
        is_selected={section_kind === 'messages'}
        has_unread={has_unread_messages}
        unread_label={t('shell.nav.unread')}
      />
      <AccountMenu trigger={<BaseIcon name="user_3" style="line" size={28} />} />
    </nav>
  )
}

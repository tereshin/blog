import { useEffect, useRef } from 'react'
import type { MouseEvent, ReactNode, UIEvent } from 'react'
import { useLocation } from 'react-router'
import { useMessagesUnreadCount } from '@/entities/conversation'
import { useSettings } from '@/entities/settings'
import { useViewer } from '@/entities/session'
import { useNavSections } from '@/entities/nav-section'
import { AppearanceToggle } from '@/features/toggle-appearance'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { cancelFeedReturn } from '@/shared/lib'
import { BaseIcon, ErrorState } from '@/shared/ui'
import { TOPICS_SECTION_ID, themeHostSectionId } from '../lib/nav-sections.ts'
import { useCurrentSection } from '../model/useCurrentSection.ts'
import { useFeedFreshness } from '../model/useFeedFreshness.ts'
import { useNavSectionCollapsed } from '../model/useNavSectionCollapsed.ts'
import { useShellStore } from '../model/useShellStore.ts'
import { LeftNavItem } from './LeftNavItem.tsx'
import { NavSection } from './NavSection.tsx'
import { NavSectionLink } from './NavSectionLink.tsx'
import { TopicsSection } from './TopicsSection.tsx'

type Mode = {
  to: string
  kind: 'popular' | 'fresh' | 'mine' | 'messages' | 'discovery'
  label: MessageKey
  /** Генератор иконок видит только буквальные `name`/`style`, поэтому оба варианта заданы явно. */
  icon: { line: ReactNode; fill: ReactNode }
}

const MODES: ReadonlyArray<Mode> = [
  {
    to: '/popular',
    kind: 'popular',
    label: 'shell.nav.popular',
    icon: {
      line: <BaseIcon name="fire" style="line" size={24} />,
      fill: <BaseIcon name="fire" style="fill" size={24} />,
    },
  },
  {
    to: '/',
    kind: 'fresh',
    label: 'shell.nav.fresh',
    icon: {
      line: <BaseIcon name="sparkles" style="line" size={24} />,
      fill: <BaseIcon name="sparkles" style="fill" size={24} />,
    },
  },
  {
    to: '/feed',
    kind: 'mine',
    label: 'shell.nav.my_feed',
    icon: {
      line: <BaseIcon name="paper" style="line" size={24} />,
      fill: <BaseIcon name="paper" style="fill" size={24} />,
    },
  },
  {
    to: '/messages',
    kind: 'messages',
    label: 'shell.nav.messages',
    icon: {
      line: <BaseIcon name="chat_3" style="line" size={24} />,
      fill: <BaseIcon name="chat_3" style="fill" size={24} />,
    },
  },
  {
    to: '/discovery',
    kind: 'discovery',
    label: 'shell.nav.rating',
    icon: {
      line: <BaseIcon name="search_2" style="line" size={24} />,
      fill: <BaseIcon name="search_2" style="fill" size={24} />,
    },
  },
]

const theme_toggle = (
  <AppearanceToggle className="h-auto w-full justify-start rounded-xl px-3 py-2 font-normal" />
)

type LeftNavProps = {
  /** Есть непрочитанные диалоги: у «Сообщений» появляется признак. */
  has_unread_messages?: boolean
}

/** Левая карточка: режимы, затем секции. Прокручивается внутри себя и не отдаёт прокрутку окну. */
export function LeftNav({ has_unread_messages = false }: LeftNavProps) {
  const { t } = useT()
  const { data: settings } = useSettings()
  const { pathname } = useLocation()
  const { viewer } = useViewer()
  const is_member = viewer.status === 'member'
  const unread_messages = useMessagesUnreadCount(is_member)
  const show_unread_messages = has_unread_messages || (unread_messages.data ?? 0) > 0
  const { highlighted } = useCurrentSection()
  const freshness = useFeedFreshness()
  const sections = useNavSections()
  const collapsed = useNavSectionCollapsed()
  const setLeftScrollTop = useShellStore((state) => state.setLeftScrollTop)
  const frame_ref = useRef<number | null>(null)
  const latest_top_ref = useRef(0)
  const custom = sections.data?.items ?? []
  const host_id = sections.isPending ? null : themeHostSectionId(custom.map((section) => section.id))

  const handleNavigation = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target instanceof Element ? event.target.closest('a') : null
    const href = link?.getAttribute('href')
    if (!href?.startsWith('/') || link?.target === '_blank') return
    cancelFeedReturn()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    latest_top_ref.current = event.currentTarget.scrollTop
    if (frame_ref.current !== null) return
    frame_ref.current = requestAnimationFrame(() => {
      frame_ref.current = null
      setLeftScrollTop(latest_top_ref.current)
    })
  }

  useEffect(
    () => () => {
      if (frame_ref.current !== null) cancelAnimationFrame(frame_ref.current)
    },
    [],
  )

  return (
    <div onClickCapture={handleNavigation} onScroll={handleScroll} className="flex flex-col gap-1 p-2">
      {MODES.filter((mode) => settings?.shell[mode.kind === 'discovery' ? 'rating' : mode.kind] !== false).map((mode) => {
        const is_fresh =
          (mode.kind === 'fresh' && freshness.fresh) || (mode.kind === 'mine' && freshness.mine)
        const has_unread = (mode.kind === 'messages' && show_unread_messages) || is_fresh
        const is_selected = highlighted?.kind === mode.kind
        return (
          <LeftNavItem
            key={mode.to}
            to={mode.to}
            is_selected={is_selected}
            icon={is_selected ? mode.icon.fill : mode.icon.line}
            has_unread={has_unread}
            unread_label={
              mode.kind === 'messages' ? t('shell.nav.unread') : t('shell.nav.freshness')
            }
          >
            {t(mode.label)}
          </LeftNavItem>
        )
      })}
      <TopicsSection
        is_expanded={!collapsed.isCollapsed(TOPICS_SECTION_ID)}
        onToggle={() => collapsed.toggle(TOPICS_SECTION_ID)}
        hosts_theme={host_id === TOPICS_SECTION_ID}
      />
      {sections.isError ? (
        <ErrorState
          title={t('shell.nav.sections_error')}
          onRetry={() => void sections.refetch()}
          className="py-4"
        />
      ) : (
        custom.map((section) => (
          <NavSection
            key={section.id}
            title={section.title}
            is_expanded={!collapsed.isCollapsed(section.id)}
            onToggle={() => collapsed.toggle(section.id)}
          >
            {section.items.map((item) => (
              <NavSectionLink
                key={item.id}
                href={item.href}
                is_external={item.is_external}
                is_selected={!item.is_external && pathname === item.href}
                icon={item.icon}
              >
                {item.title}
              </NavSectionLink>
            ))}
            {host_id === section.id ? theme_toggle : null}
          </NavSection>
        ))
      )}
    </div>
  )
}

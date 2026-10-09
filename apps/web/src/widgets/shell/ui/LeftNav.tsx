import { useEffect, useRef } from 'react'
import type { UIEvent } from 'react'
import { useMessagesUnreadCount, useMessagesUnreadLive } from '@/entities/conversation'
import { useViewer } from '@/entities/session'
import { TopicNavItem, useTopics } from '@/entities/topic'
import { useT } from '@/shared/i18n'
import type { MessageKey } from '@/shared/i18n'
import { Button, ErrorState, Skeleton } from '@/shared/ui'
import { useCurrentSection } from '../model/useCurrentSection.ts'
import { useFeedFreshness } from '../model/useFeedFreshness.ts'
import { useShellStore } from '../model/useShellStore.ts'
import { LeftNavItem } from './LeftNavItem.tsx'

const MODES: ReadonlyArray<{ to: string; kind: 'popular' | 'fresh' | 'mine' | 'messages' | 'rating'; label: MessageKey }> = [
  { to: '/popular', kind: 'popular', label: 'shell.nav.popular' },
  { to: '/', kind: 'fresh', label: 'shell.nav.fresh' },
  { to: '/feed', kind: 'mine', label: 'shell.nav.my_feed' },
  { to: '/messages', kind: 'messages', label: 'shell.nav.messages' },
  { to: '/rating', kind: 'rating', label: 'shell.nav.rating' },
]

const VISIBLE_TOPICS = 8

type LeftNavProps = {
  /** Есть непрочитанные диалоги: у «Сообщений» появляется признак. */
  has_unread_messages?: boolean
}

/** Левая карточка: режимы, затем темы. Прокручивается внутри себя и не отдаёт прокрутку окну. */
export function LeftNav({ has_unread_messages = false }: LeftNavProps) {
  const { t } = useT()
  const { viewer } = useViewer()
  const is_member = viewer.status === 'member'
  const unread_messages = useMessagesUnreadCount(is_member)
  useMessagesUnreadLive(is_member)
  const show_unread_messages = has_unread_messages || (unread_messages.data ?? 0) > 0
  const { highlighted } = useCurrentSection()
  const topics = useTopics()
  const freshness = useFeedFreshness()
  const is_expanded = useShellStore((state) => state.is_topics_expanded)
  const setTopicsExpanded = useShellStore((state) => state.setTopicsExpanded)
  const setLeftScrollTop = useShellStore((state) => state.setLeftScrollTop)
  const frame_ref = useRef<number | null>(null)
  const latest_top_ref = useRef(0)

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

  const active_topics = (topics.data ?? []).filter((topic) => topic.status === 'active')
  const shown_topics = is_expanded ? active_topics : active_topics.slice(0, VISIBLE_TOPICS)
  const has_hidden = active_topics.length > VISIBLE_TOPICS

  return (
    <div onScroll={handleScroll} className="flex flex-col gap-1 p-2">
        {MODES.map((mode) => {
          const is_fresh = (mode.kind === 'fresh' && freshness.fresh) || (mode.kind === 'mine' && freshness.mine)
          const has_unread = (mode.kind === 'messages' && show_unread_messages) || is_fresh
          return (
            <LeftNavItem
              key={mode.to}
              to={mode.to}
              is_selected={highlighted?.kind === mode.kind}
              has_unread={has_unread}
              unread_label={mode.kind === 'messages' ? t('shell.nav.unread') : t('shell.nav.freshness')}
            >
              {t(mode.label)}
            </LeftNavItem>
          )
        })}
        <h2 className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted">{t('shell.nav.topics')}</h2>
        {topics.isPending ? (
          <div className="flex flex-col gap-2 px-3 py-1" role="status" aria-label={t('common.loading')}>
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        ) : topics.isError ? (
          <ErrorState title={t('shell.nav.topics_error')} onRetry={() => void topics.refetch()} className="py-4" />
        ) : active_topics.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted">{t('shell.nav.topics_empty')}</p>
        ) : (
          <>
            {shown_topics.map((topic) => (
              <TopicNavItem
                key={topic.id}
                topic={topic}
                is_selected={highlighted?.kind === 'topic' && highlighted.topic_id === topic.id}
              />
            ))}
            {has_hidden ? (
              <Button variant="ghost" size="sm" className="self-start" onPress={() => setTopicsExpanded(!is_expanded)}>
                {is_expanded ? t('common.collapse') : t('common.show_all')}
              </Button>
            ) : null}
          </>
        )}
    </div>
  )
}

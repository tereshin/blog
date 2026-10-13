import { lazy, Suspense } from 'react'
import { useViewer } from '@/entities/session'
import { TopicNavItem, useTopics } from '@/entities/topic'
import { AppearanceToggle } from '@/features/toggle-appearance'
import { useT } from '@/shared/i18n'
import { Button, ErrorState, Skeleton } from '@/shared/ui'
import { useCurrentSection } from '../model/useCurrentSection.ts'
import { useShellStore } from '../model/useShellStore.ts'
import { NavSection } from './NavSection.tsx'

const TopicCreateButton = lazy(() =>
  import('@/features/manage-topics').then((module) => ({ default: module.TopicCreateButton })),
)

const VISIBLE_TOPICS = 8

type TopicsSectionProps = {
  is_expanded: boolean
  onToggle: () => void
  hosts_theme: boolean
}

/** Встроенная секция тем: список, «Показать все» и, если своих секций нет, переключатель темы. */
export function TopicsSection({ is_expanded, onToggle, hosts_theme }: TopicsSectionProps) {
  const { t } = useT()
  const { is_superadmin } = useViewer()
  const { highlighted } = useCurrentSection()
  const topics = useTopics()
  const show_all = useShellStore((state) => state.is_topics_expanded)
  const setTopicsExpanded = useShellStore((state) => state.setTopicsExpanded)
  const active_topics = (topics.data ?? []).filter((topic) => topic.status === 'active')
  const shown_topics = show_all ? active_topics : active_topics.slice(0, VISIBLE_TOPICS)
  const has_hidden = active_topics.length > VISIBLE_TOPICS

  return (
    <NavSection
      title={t('shell.nav.topics')}
      is_expanded={is_expanded}
      onToggle={onToggle}
      header_action={
        is_superadmin ? (
          <Suspense fallback={null}>
            <TopicCreateButton />
          </Suspense>
        ) : null
      }
    >
      {topics.isPending ? (
        <div className="flex flex-col gap-2 px-3 py-1" role="status" aria-label={t('common.loading')}>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-3/5" />
        </div>
      ) : topics.isError ? (
        <ErrorState
          title={t('shell.nav.topics_error')}
          onRetry={() => void topics.refetch()}
          className="py-4"
        />
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
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onPress={() => setTopicsExpanded(!show_all)}
            >
              {show_all ? t('common.collapse') : t('common.show_all')}
            </Button>
          ) : null}
        </>
      )}
      {hosts_theme ? (
        <AppearanceToggle className="h-auto w-full justify-start rounded-xl px-3 py-2 font-normal" />
      ) : null}
    </NavSection>
  )
}

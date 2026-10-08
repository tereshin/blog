import { useLocation } from 'react-router'
import { useTopics } from '@/entities/topic'
import { getSectionFromPath } from '../lib/section-from-path.ts'
import { getHighlightedItem } from '../lib/section-highlight.ts'
import type { HighlightedItem, SectionView } from '../lib/section-highlight.ts'
import { useShellStore } from './useShellStore.ts'

type CurrentSection = { section: SectionView; highlighted: HighlightedItem | null }

/** Раздел по адресу и пункт навигации, который в нём выделен. Тема статьи берётся из стора каркаса. */
export function useCurrentSection(): CurrentSection {
  const { pathname } = useLocation()
  const { data: topics = [] } = useTopics()
  const article_topic_id = useShellStore((state) => state.article_topic_id)
  const section = getSectionFromPath({ pathname, topics, article_topic_id })
  const active_ids = topics.filter((topic) => topic.status === 'active').map((topic) => topic.id)
  return { section, highlighted: getHighlightedItem(section, active_ids) }
}

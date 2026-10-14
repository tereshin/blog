import { useDiscoverySearchResults } from '../model/useDiscoverySearchResults.ts'
import type { SearchResult } from '@/entities/search'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui'
import { DiscoveryPeopleList, DiscoveryTopicList } from '@/widgets/discovery'
import { DiscoveryArticleList } from './DiscoveryArticleList.tsx'

type DiscoverySearchResultsProps = { pages: SearchResult[] }

export function DiscoverySearchResults({ pages }: DiscoverySearchResultsProps) {
  const { t } = useT()
  const { articles, people, topics } = useDiscoverySearchResults(pages)
  if (!articles.length && !people.length && !topics.length)
    return <EmptyState title={t('search.empty')} description={t('search.empty_hint')} />
  return (
    <div className="flex flex-col gap-6">
      {people.length ? (
        <section aria-label={t('discovery.blogs')}>
          <h2 className="text-xl font-semibold">{t('discovery.blogs')}</h2>
          <DiscoveryPeopleList people={people} />
        </section>
      ) : null}
      {topics.length ? (
        <section aria-label={t('discovery.topics')}>
          <h2 className="text-xl font-semibold">{t('discovery.topics')}</h2>
          <DiscoveryTopicList topics={topics} />
        </section>
      ) : null}
      {articles.length ? (
        <section aria-label={t('search.articles')} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{t('search.articles')}</h2>
          <DiscoveryArticleList articles={articles} />
        </section>
      ) : null}
    </div>
  )
}

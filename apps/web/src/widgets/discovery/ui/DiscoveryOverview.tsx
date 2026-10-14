import { Link } from 'react-router'
import { useDiscoveryOverview } from '../model/useDiscoveryOverview.ts'
import { useT } from '@/shared/i18n'
import { DiscoveryListState } from './DiscoveryListState.tsx'
import { DiscoveryPeopleList } from './DiscoveryPeopleList.tsx'
import { DiscoveryTopicList } from './DiscoveryTopicList.tsx'

export function DiscoveryOverview() {
  const { t } = useT()
  const { rating, topics, people, preview_topics } = useDiscoveryOverview()
  return (
    <div className="flex flex-col gap-8">
      <section aria-label={t('discovery.blogs')}>
        <h2 className="mb-1 text-xl font-semibold">{t('discovery.blogs')}</h2>
        <DiscoveryListState
          is_pending={rating.isPending}
          is_error={rating.isError}
          is_empty={people.length === 0}
          onRetry={() => void rating.refetch()}
        >
          <DiscoveryPeopleList people={people} start_rank={1} />
        </DiscoveryListState>
        <Link
          className="mt-2 inline-block text-accent outline-offset-2 hover:underline"
          to="/discovery/blogs"
        >
          {t('discovery.show_all')}
        </Link>
      </section>
      <section aria-label={t('discovery.topics')}>
        <h2 className="mb-1 text-xl font-semibold">{t('discovery.topics')}</h2>
        <DiscoveryListState
          is_pending={topics.isPending}
          is_error={topics.isError}
          is_empty={preview_topics.length === 0}
          onRetry={() => void topics.refetch()}
        >
          <DiscoveryTopicList topics={preview_topics} />
        </DiscoveryListState>
        <Link
          className="mt-2 inline-block text-accent outline-offset-2 hover:underline"
          to="/discovery/topics"
        >
          {t('discovery.show_all')}
        </Link>
      </section>
    </div>
  )
}

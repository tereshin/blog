import { Link } from 'react-router'
import { useDiscoveryTopics } from '../model/useDiscoveryTopics.ts'
import { useT } from '@/shared/i18n'
import { Card } from '@/shared/ui'
import { DiscoveryListState, DiscoveryTopicList } from '@/widgets/discovery'

export default function DiscoveryTopicsPage() {
  const { t } = useT()
  const { query, topics } = useDiscoveryTopics()
  return (
    <Card className="mx-auto max-w-[var(--shell-content-width,640px)] gap-0">
      <Card.Header className="px-5 pt-5 sm:px-6">
        <Link to="/discovery" className="text-sm text-accent hover:underline">
          {t('discovery.title')}
        </Link>
        <h1 className="text-xl font-semibold">{t('discovery.topics')}</h1>
      </Card.Header>
      <Card.Content className="px-5 sm:px-6">
        <DiscoveryListState
          is_pending={query.isPending}
          is_error={query.isError}
          is_empty={topics.length === 0}
          onRetry={() => void query.refetch()}
        >
          <DiscoveryTopicList topics={topics} />
        </DiscoveryListState>
      </Card.Content>
    </Card>
  )
}

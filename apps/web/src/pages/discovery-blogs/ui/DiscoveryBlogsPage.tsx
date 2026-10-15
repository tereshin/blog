import { useDiscoveryBlogs } from '../model/useDiscoveryBlogs.ts'
import { useT } from '@/shared/i18n'
import { Button, Card } from '@/shared/ui'
import { DiscoveryListState, DiscoveryPeopleList } from '@/widgets/discovery'

export default function DiscoveryBlogsPage() {
  const { t } = useT()
  const { rating, people } = useDiscoveryBlogs()
  return (
    <Card className="mx-auto max-w-[var(--shell-content-width,640px)] gap-0">
      <Card.Header>
        <h1 className="text-xl font-semibold">{t('discovery.blogs')}</h1>
      </Card.Header>
      <Card.Content>
        <DiscoveryListState
          is_pending={rating.isPending}
          is_error={rating.isError}
          is_empty={people.length === 0}
          onRetry={() => void rating.refetch()}
        >
          <DiscoveryPeopleList people={people} start_rank={1} />
        </DiscoveryListState>
        {rating.hasNextPage ? (
          <Button
            variant="ghost"
            className="mt-4 w-full"
            isDisabled={rating.isFetchingNextPage}
            onPress={() => void rating.fetchNextPage()}
          >
            {t('common.more')}
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  )
}

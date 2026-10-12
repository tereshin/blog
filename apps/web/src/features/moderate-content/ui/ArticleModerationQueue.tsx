import { createModerationReturnState } from '@/entities/admin'
import { Link, useLocation } from 'react-router'
import { ArticleCard } from '@/entities/article'
import { useT } from '@/shared/i18n'
import { Button, Card, EmptyState, ErrorState, Skeleton } from '@/shared/ui'
import { useArticleModerationQueue } from '../model/useArticleModerationQueue.ts'
import { ArticleModerationActions } from './ArticleModerationActions.tsx'

export function ArticleModerationQueue({ filter }: { filter: 'reported' | 'hidden' }) {
  const { t } = useT()
  const { pathname } = useLocation()
  const { query, items } = useArticleModerationQueue(filter)
  if (query.isPending) return <Skeleton className="h-56" aria-label={t('common.loading')} />
  if (query.isError)
    return <ErrorState title={t('error.unknown')} onRetry={() => void query.refetch()} />
  if (!items.length)
    return (
      <EmptyState
        title={t(
          filter === 'reported'
            ? 'admin.moderation.reports_empty'
            : 'admin.moderation.hidden_empty',
        )}
        description={t(
          filter === 'reported'
            ? 'admin.moderation.reports_empty_hint'
            : 'admin.moderation.hidden_empty_hint',
        )}
      />
    )
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <Card key={item.article.id}>
          <Card.Content>
            <ArticleCard article={item.article}>
              <ArticleCard.Header />
              <ArticleCard.Title>
                <Link
                  className="text-foreground outline-offset-2 hover:underline"
                  to={`/p/${encodeURIComponent(item.article.slug)}?from=moderation`}
                  state={createModerationReturnState(pathname)}
                >
                  {item.article.title}
                </Link>
              </ArticleCard.Title>
              <ArticleCard.Excerpt />
            </ArticleCard>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ArticleModerationActions article_id={item.article.id} status={item.article.status} />
              <Link
                className="rounded text-sm text-accent"
                state={createModerationReturnState(pathname)}
                to={`/p/${encodeURIComponent(item.article.slug)}?from=moderation`}
              >
                {t('admin.moderation.open')}
              </Link>
            </div>
          </Card.Content>
        </Card>
      ))}
      {query.hasNextPage ? (
        <Button
          variant="ghost"
          isDisabled={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        >
          {t('feed.load_more')}
        </Button>
      ) : null}
    </div>
  )
}

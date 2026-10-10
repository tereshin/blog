import { ArticleCard } from '@/entities/article'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, ErrorState, Tabs } from '@/shared/ui'
import { ArticleFeedItem, ArticleOverflowMenu } from '@/widgets/feed'
import { UserCommentRow } from '@/widgets/profile-card'
import type { useProfileActivity } from '../model/useProfileActivity.ts'

type ProfileActivityFeedProps = { activity: ReturnType<typeof useProfileActivity>; is_own: boolean }

export function ProfileActivityFeed({ activity, is_own }: ProfileActivityFeedProps) {
  const { t } = useT()
  const { tab, list, article_items, comment_items, viewer_states } = activity
  const has_load_error = list.isError && !list.data
  const content = (
    <>
      {list.isPending ? <ArticleCard.Skeleton /> : null}
      {has_load_error ? (
        <ErrorState title={t('error.unknown')} onRetry={() => void list.refetch()} />
      ) : null}
      {tab === 'posts' && !list.isPending && !has_load_error ? (
        article_items.length === 0 ? (
          <EmptyState title={t('profile.posts_empty')} />
        ) : (
          <ol className="flex flex-col gap-4">
            {article_items.map((article) => (
              <li key={article.id}>
                {article.status === 'published' ? (
                  <ArticleFeedItem article={article} viewer_state={viewer_states.get(article.id)} />
                ) : (
                  <ArticleCard article={article}>
                    <p className="px-5 pt-4 text-xs text-muted">
                      {t(`profile.status.${article.status}`)}
                    </p>
                    <ArticleCard.Header
                      menu={
                        <ArticleOverflowMenu
                          article_id={article.id}
                          slug={article.slug}
                          is_own={is_own}
                        />
                      }
                    />
                    <ArticleCard.Title />
                    <ArticleCard.Excerpt />
                    <ArticleCard.Image />
                  </ArticleCard>
                )}
              </li>
            ))}
          </ol>
        )
      ) : null}
      {tab === 'comments' && !list.isPending && !has_load_error ? (
        comment_items.length === 0 ? (
          <EmptyState title={t('profile.comments_empty')} />
        ) : (
          <ul className="flex flex-col gap-4">
            {comment_items.map((comment) => (
              <UserCommentRow key={comment.id} comment={comment} />
            ))}
          </ul>
        )
      ) : null}
      {list.isFetchNextPageError ? (
        <ErrorState
          title={t('feed.load_more_error')}
          onRetry={() => void list.fetchNextPage()}
          className="py-4"
        />
      ) : null}
      {list.hasNextPage && !list.isFetchNextPageError ? (
        <div className="flex justify-center py-2">
          <Button
            variant="ghost"
            onPress={() => void list.fetchNextPage()}
            isDisabled={list.isFetchingNextPage}
          >
            {t('common.more')}
          </Button>
        </div>
      ) : null}
    </>
  )
  return (
    <>
      <Tabs.Panel id="posts" className="m-0 flex flex-col gap-4 p-0">
        {tab === 'posts' ? content : null}
      </Tabs.Panel>
      <Tabs.Panel id="comments" className="m-0 flex flex-col gap-4 p-0">
        {tab === 'comments' ? content : null}
      </Tabs.Panel>
    </>
  )
}

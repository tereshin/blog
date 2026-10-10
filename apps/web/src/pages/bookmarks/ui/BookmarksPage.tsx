import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { articleKeys, ArticleCard, getBookmarks, useArticleStates } from '@/entities/article'
import { useViewer } from '@/entities/session'
import { BookmarkControl } from '@/features/bookmark'
import { useLoginDialog } from '@/features/login'
import { SavedComments } from '@/features/send-comment'
import { ShareButton } from '@/features/share-article'
import { useT } from '@/shared/i18n'
import { BookmarkIcon, Button, EmptyState, ErrorState, Tabs } from '@/shared/ui'
import { ArticleOverflowMenu } from '@/widgets/feed'
import { useShellStore } from '@/widgets/shell'

function SavedArticles() {
  const { t } = useT()
  const { viewer, is_own } = useViewer()
  const openLogin = useLoginDialog((state) => state.open)
  const is_member = viewer.status === 'member'
  const query = useQuery({
    queryKey: articleKeys.bookmarks(),
    queryFn: ({ signal }) => getBookmarks(signal),
    enabled: is_member,
  })
  const articles = query.data ?? []
  const states = useArticleStates(
    articles.map((article) => article.id),
    is_member,
  )
  const visible = articles.filter((article) => states.get(article.id)?.is_bookmarked !== false)

  if (viewer.status === 'guest') {
    return (
      <EmptyState title={t('bookmarks.guest')} description={t('bookmarks.guest_hint')} icon={<BookmarkIcon width={28} height={28} />} className="py-16">
        <Button variant="primary" onPress={() => openLogin('required')}>
          {t('header.sign_in')}
        </Button>
      </EmptyState>
    )
  }

  if (query.isPending) return <ArticleCard.Skeleton />
  if (query.isError)
    return <ErrorState title={t('feed.load_error')} onRetry={() => void query.refetch()} />
  if (visible.length === 0) return <EmptyState title={t('bookmarks.empty')} description={t('bookmarks.empty_hint')} icon={<BookmarkIcon width={28} height={28} />} className="py-16" />

  return (
    <div className="flex flex-col gap-4">
      {visible.map((article) => {
        const viewer_state = states.get(article.id)
        return (
          <ArticleCard key={article.id} article={article}>
            <ArticleCard.Header
              menu={
                <ArticleOverflowMenu
                  article_id={article.id}
                  slug={article.slug}
                  is_own={is_own(article.author.user_id)}
                />
              }
            />
            <ArticleCard.Title />
            <ArticleCard.Excerpt />
            <ArticleCard.Image />
            <ArticleCard.Actions
              bookmark={
                <BookmarkControl
                  article_id={article.id}
                  slug={article.slug}
                  count={article.bookmark_count}
                  is_bookmarked={viewer_state?.is_bookmarked ?? true}
                />
              }
              share={<ShareButton slug={article.slug} />}
            />
          </ArticleCard>
        )
      })}
    </div>
  )
}

export default function BookmarksPage() {
  const { t } = useT()
  const { viewer } = useViewer()
  const [tab, setTab] = useState('articles')
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
  }, [setHeaderCenter])
  return (
    <div className="flex flex-col gap-4">
      {viewer.status === 'member' ? (
        <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))}>
          <Tabs.List aria-label={t('comment.bookmark')}>
            <Tabs.Tab id="articles">{t('comment.saved_articles')}</Tabs.Tab>
            <Tabs.Tab id="comments">{t('comment.saved_title')}</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      ) : null}
      {viewer.status === 'member' && tab === 'comments' ? <SavedComments /> : <SavedArticles />}
    </div>
  )
}

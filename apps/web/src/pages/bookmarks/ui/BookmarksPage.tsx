import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArticleCard } from '@/entities/article'
import { useViewer } from '@/entities/session'
import { BookmarkControl } from '@/features/bookmark'
import { useLoginDialogStore } from '@/features/login'
import { SavedComments } from '@/features/send-comment'
import { ShareButton } from '@/features/share-article'
import { useT } from '@/shared/i18n'
import { BookmarkIcon, Button, EmptyState, ErrorState, Tabs } from '@/shared/ui'
import { ArticleOverflowMenu, VirtualFeedList } from '@/widgets/feed'
import { useShellStore } from '@/widgets/shell'
import { useBookmarks } from '../model/useBookmarks.ts'

const VIRTUALIZATION_THRESHOLD = 100

function SavedArticles() {
  const { t } = useT()
  const openLogin = useLoginDialogStore((state) => state.open)
  const { viewer, is_own, query, states, visible } = useBookmarks()
  const article_by_id = useMemo(
    () => new Map(visible.map((article) => [article.id, article])),
    [visible],
  )
  const article_ids = visible.map((article) => article.id)
  const handleNearEnd = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage()
  }, [query])

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

  function renderCard(article_id: string) {
    const article = article_by_id.get(article_id)
    if (!article) return null
    const viewer_state = states.get(article.id)
    return (
      <ArticleCard article={article}>
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
  }

  return (
    <div className="flex flex-col gap-4">
      {article_ids.length > VIRTUALIZATION_THRESHOLD ? (
        <VirtualFeedList article_ids={article_ids} renderItem={renderCard} onNearEnd={handleNearEnd} />
      ) : (
        article_ids.map((id) => <div key={id}>{renderCard(id)}</div>)
      )}
      {query.hasNextPage ? (
        <Button variant="ghost" isDisabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()}>
          {t('common.more')}
        </Button>
      ) : null}
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
    <div className="flex flex-col gap-4 max-w-[var(--shell-content-width,640px)] mx-auto">
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

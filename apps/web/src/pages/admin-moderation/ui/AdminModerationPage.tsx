import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArticleCard } from '@/entities/article'
import { RequireRole } from '@/entities/session'
import {
  CommentReportQueue,
  ArticleModerationActions,
  getModerationQueue,
  moderationKeys,
} from '@/features/moderate-content'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, ErrorState, Tabs } from '@/shared/ui'
import { useShellStore } from '@/widgets/shell'

type Filter = 'reported' | 'hidden' | 'find' | 'comments'

function Queue({ filter }: { filter: 'reported' | 'hidden' }) {
  const { t } = useT()
  const queue = useQuery({
    queryKey: moderationKeys.list(filter),
    queryFn: ({ signal }) => getModerationQueue(filter, signal),
  })
  if (queue.isPending) return <p className="text-sm text-muted">{t('common.loading')}</p>
  if (queue.isError)
    return <ErrorState title={t('error.unknown')} onRetry={() => void queue.refetch()} />
  if (queue.data.length === 0) {
    return (
      <EmptyState
        title={
          filter === 'reported'
            ? t('admin.moderation.reports_empty')
            : t('admin.moderation.hidden_empty')
        }
      />
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {queue.data.map((item) => (
        <div key={item.article.id} className="flex flex-col gap-2">
          <ArticleCard article={item.article}>
            <ArticleCard.Header />
            <ArticleCard.Title />
            <ArticleCard.Excerpt />
          </ArticleCard>
          <ArticleModerationActions article_id={item.article.id} status={item.article.status} />
          <Link className="text-sm text-accent" to={`/p/${item.article.slug}?from=moderation`}>
            {t('admin.moderation.open')}
          </Link>
        </div>
      ))}
    </div>
  )
}

function FindArticle() {
  const { t } = useT()
  const [slug, setSlug] = useState('')
  return (
    <form className="flex gap-2" onSubmit={(event) => event.preventDefault()}>
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        {t('admin.moderation.find')}
        <input
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder={t('admin.moderation.find_placeholder')}
          className="rounded-lg border border-separator bg-background px-3 py-2"
        />
      </label>
      <Button variant="primary" className="self-end" isDisabled={slug.trim().length === 0}>
        <Link to={`/p/${encodeURIComponent(slug.trim())}?from=moderation`}>
          {t('admin.moderation.open')}
        </Link>
      </Button>
    </form>
  )
}

function ModerationScreen() {
  const { t } = useT()
  const [filter, setFilter] = useState<Filter>('reported')
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-xl font-semibold">{t('admin.moderation')}</h1>
      <Tabs
        selectedKey={filter}
        onSelectionChange={(key) =>
          setFilter(key === 'hidden' || key === 'find' || key === 'comments' ? key : 'reported')
        }
      >
        <Tabs.List aria-label={t('admin.moderation')}>
          <Tabs.Tab id="reported">{t('admin.moderation.reports')}</Tabs.Tab>
          <Tabs.Tab id="hidden">{t('admin.moderation.hidden')}</Tabs.Tab>
          <Tabs.Tab id="comments">{t('comment.reports_title')}</Tabs.Tab>
          <Tabs.Tab id="find">{t('admin.moderation.find')}</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      {filter === 'comments' ? (
        <CommentReportQueue />
      ) : filter === 'find' ? (
        <FindArticle />
      ) : (
        <Queue filter={filter} />
      )}
    </div>
  )
}

export default function AdminModerationPage() {
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
  }, [setHeaderCenter])

  return (
    <RequireRole role="admin">
      <ModerationScreen />
    </RequireRole>
  )
}

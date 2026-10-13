import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { getPublicPage, pageKeys } from '@/entities/page'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { BlockRenderer, Card, EmptyState, ErrorState } from '@/shared/ui'
import { useShellStore } from '@/widgets/shell'
export default function SimplePage() {
  const { slug = '' } = useParams()
  const { t } = useT()
  const query = useQuery({
    queryKey: pageKeys.public(slug),
    queryFn: ({ signal }) => getPublicPage(slug, signal),
    staleTime: 0,
    retry: false,
  })
  const setHeader = useShellStore((state) => state.setHeaderCenter)
  const setTopic = useShellStore((state) => state.setArticleTopicId)
  useEffect(() => {
    setHeader({ kind: 'back', title: query.data?.title ?? t('pages.title') })
    setTopic(null)
  }, [query.data?.title, setHeader, setTopic, t])
  if (query.isError)
    return query.error instanceof ApiError && query.error.status === 404 ? (
      <EmptyState title={t('pages.not_found')} />
    ) : (
      <ErrorState title={t('pages.load_error')} onRetry={() => void query.refetch()} />
    )
  if (!query.data) return <p>{t('common.loading')}</p>
  return (
    <Card>
      <Card.Header>
        <h1 className="break-words text-2xl font-semibold">{query.data.title}</h1>
      </Card.Header>
      <Card.Content>
        <article>
          <BlockRenderer blocks={query.data.blocks.blocks} />
        </article>
      </Card.Content>
    </Card>
  )
}

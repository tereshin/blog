import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { BlockRenderer, Card, EmptyState, ErrorState } from '@/shared/ui'
import { useSimplePage } from '../model/useSimplePage.ts'

export default function SimplePage() {
  const { t } = useT()
  const query = useSimplePage()
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

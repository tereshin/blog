import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useTopic } from '@/entities/topic'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, ErrorState } from '@/shared/ui'
import { ArticleFeed } from '@/widgets/feed'
import { useShellStore } from '@/widgets/shell'
import { TopicHeader } from '@/widgets/topic-header'

export default function TopicPage() {
  const { slug = '' } = useParams()
  const { t } = useT()
  const topic = useTopic(slug)
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const setArticleTopicId = useShellStore((state) => state.setArticleTopicId)

  useEffect(() => {
    setHeaderCenter({ kind: 'pill' })
    setArticleTopicId(null)
  }, [setArticleTopicId, setHeaderCenter])

  if (topic.isPending) return null
  if (topic.isError || !topic.data) {
    const missing = topic.error instanceof ApiError && topic.error.status === 404
    return missing ? (
      <EmptyState title={t('topic.not_found')} className="py-16" />
    ) : (
      <ErrorState title={t('error.unknown')} onRetry={() => void topic.refetch()} />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <TopicHeader
        topic={topic.data}
        follow={
          <Button variant="primary" isDisabled>
            {t('profile.follow')}
          </Button>
        }
      />
      <ArticleFeed mode={`topic:${topic.data.slug}`} />
    </div>
  )
}

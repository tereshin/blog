import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useTopic } from '@/entities/topic'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { FollowButton } from '@/features/follow'
import { EmptyState, ErrorState, IdentityHeader, Tabs } from '@/shared/ui'
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
    setHeaderCenter({ kind: 'empty' })
    setArticleTopicId(null)
  }, [setArticleTopicId, setHeaderCenter])

  if (topic.isPending) return <IdentityHeader.Skeleton />
  if (topic.isError || !topic.data) {
    const missing = topic.error instanceof ApiError && topic.error.status === 404
    return missing ? (
      <EmptyState title={t('topic.not_found')} className="py-16" />
    ) : (
      <ErrorState title={t('error.unknown')} onRetry={() => void topic.refetch()} />
    )
  }

  return (
    <Tabs variant="secondary" selectedKey="posts" className="gap-4">
      <TopicHeader
        topic={topic.data}
        follow={
          <FollowButton
            variant="primary"
            size="md"
            target_type="topic"
            target_id={topic.data.id}
            is_following={topic.data.is_following}
            is_own={false}
          />
        }
      />
      <Tabs.Panel id="posts" className="m-0 flex flex-col gap-4 p-0">
        <p className="px-5 py-2 text-sm text-muted sm:px-6">{t('profile.sort.fresh')}</p>
        <ArticleFeed mode={`topic:${topic.data.slug}`} feed_key={`topic:${topic.data.id}`} />
      </Tabs.Panel>
    </Tabs>
  )
}

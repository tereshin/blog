import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useTopic } from '@/entities/topic'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useViewer } from '@/entities/session'
import { TopicSettingsButton } from '@/features/manage-topics'
import { ImageUploadButton } from '@/features/upload-media'
import { FollowButton } from '@/features/follow'
import { EmptyState, ErrorState, IdentityHeader, Tabs } from '@/shared/ui'
import { ArticleFeed } from '@/widgets/feed'
import { useShellStore } from '@/widgets/shell'
import { TopicHeader } from '@/widgets/topic-header'

export default function TopicPage() {
  const { slug = '' } = useParams()
  const { t } = useT()
  const topic = useTopic(slug)
  const { is_superadmin } = useViewer()
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
      <EmptyState
        title={t('topic.not_found')}
        description={t('topic.not_found_hint')}
        className="py-16"
      />
    ) : (
      <ErrorState title={t('error.unknown')} onRetry={() => void topic.refetch()} />
    )
  }

  return (
    <Tabs variant="secondary" selectedKey="posts" className="w-full min-w-0 gap-4 max-w-[640px] mx-auto">
      <TopicHeader
        topic={topic.data}
        follow={
          <div className="flex items-center gap-2">
            {is_superadmin ? (
              <TopicSettingsButton
                topic={topic.data}
                upload={(field, onUploaded) => (
                  <ImageUploadButton
                    label={t(field === 'avatar' ? 'admin.topics.avatar' : 'admin.topics.cover')}
                    onUploaded={onUploaded}
                  />
                )}
              />
            ) : null}
            <FollowButton
              variant="primary"
              size="md"
              target_type="topic"
              target_id={topic.data.id}
              is_following={topic.data.is_following}
              is_own={false}
            />
          </div>
        }
      />
      <Tabs.Panel id="posts" className="m-0 flex flex-col gap-3 p-0">
        <p className="px-5  text-sm text-muted sm:px-6">{t('profile.sort.fresh')}</p>
        <ArticleFeed mode={`topic:${topic.data.slug}`} feed_key={`topic:${topic.data.id}`} />
      </Tabs.Panel>
    </Tabs>
  )
}

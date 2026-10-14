import { useParams } from 'react-router'
import { useTopic } from '@/entities/topic'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useViewer } from '@/entities/session'
import { TopicSettingsButton, useManageTopics } from '@/features/manage-topics'
import { ImageUploadButton } from '@/features/upload-media'
import { FollowButton } from '@/features/follow'
import { BaseIcon, EmptyState, ErrorState, IdentityHeader, Tabs } from '@/shared/ui'
import { ArticleFeed } from '@/widgets/feed'
import { useShellPage } from '@/widgets/shell'
import { TopicHeader } from '@/widgets/topic-header'

export default function TopicPage() {
  const { slug = '' } = useParams()
  const { t } = useT()
  const topic = useTopic(slug)
  const { is_superadmin } = useViewer()
  const { update } = useManageTopics()
  useShellPage({ should_clear_topic: true })

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
    <Tabs
      variant="secondary"
      selectedKey="posts"
      className="w-full min-w-0 gap-4 max-w-[var(--shell-content-width,640px)] mx-auto"
    >
      <TopicHeader
        topic={topic.data}
        cover_action={
          is_superadmin ? (
            <ImageUploadButton
              label={t(topic.data.cover_url ? 'profile.change_cover' : 'profile.add_cover')}
              className="bg-white! text-neutral-950!"
              is_disabled={update.isPending}
              onUploaded={async (cover_url) => {
                await update.mutateAsync({ id: topic.data.id, body: { cover_url } })
              }}
            />
          ) : null
        }
        avatar_action={
          is_superadmin ? (
            <ImageUploadButton
              label={t('profile.change_avatar')}
              container_className="size-full"
              className="group/avatar-upload size-full min-w-0 rounded-avatar bg-transparent p-0 text-white shadow-none transition-colors hover:bg-black/50 focus-visible:bg-black/50 [@media(hover:none)]:bg-black/35"
              is_disabled={update.isPending}
              onUploaded={async (avatar_url) => {
                await update.mutateAsync({ id: topic.data.id, body: { avatar_url } })
              }}
            >
              <BaseIcon
                name="camera"
                style="line"
                size={28}
                className="opacity-0 transition-opacity group-hover/avatar-upload:opacity-100 group-focus-visible/avatar-upload:opacity-100 [@media(hover:none)]:opacity-100"
              />
            </ImageUploadButton>
          ) : null
        }
        follow={
          <div className="flex items-center gap-2">
            {is_superadmin ? <TopicSettingsButton topic={topic.data} /> : null}
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
        <p className="px-5  text-sm text-muted">{t('profile.sort.fresh')}</p>
        <ArticleFeed mode={`topic:${topic.data.slug}`} feed_key={`topic:${topic.data.id}`} />
      </Tabs.Panel>
    </Tabs>
  )
}

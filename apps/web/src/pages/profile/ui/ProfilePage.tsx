import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useProfile } from '@/entities/profile'
import { useUpdateProfile } from '@/features/edit-profile'
import { FollowButton } from '@/features/follow'
import { ImageUploadButton } from '@/features/upload-media'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { BaseIcon, EmptyState, ErrorState, Tabs } from '@/shared/ui'
import { FeedSortMenu } from '@/widgets/feed'
import { OwnerActions, ProfileCard, ProfileStatus } from '@/widgets/profile-card'
import { useShellStore } from '@/widgets/shell'
import { ProfileActivityFeed } from './ProfileActivityFeed.tsx'
import { useProfileActivity } from '../model/useProfileActivity.ts'

export default function ProfilePage() {
  const { slug = '' } = useParams()
  const { t } = useT()
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const setArticleTopicId = useShellStore((state) => state.setArticleTopicId)
  const profile_query = useProfile(slug)
  const profile = profile_query.data
  const activity = useProfileActivity(slug, profile)
  const { tab, setTab, sort, setSort } = activity
  const update = useUpdateProfile()

  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
    setArticleTopicId(null)
  }, [setHeaderCenter, setArticleTopicId])

  if (profile_query.isPending) return <ProfileCard.Skeleton />
  if (profile_query.isError || !profile) {
    const missing = profile_query.error instanceof ApiError && profile_query.error.status === 404
    return missing ? <EmptyState title={t('profile.not_found')} /> : <ErrorState title={t('error.unknown')} onRetry={() => void profile_query.refetch()} />
  }

  const address = profile.slug ?? String(profile.public_number)

  return (
    <Tabs
      variant="secondary"
      className="gap-4"
      selectedKey={tab}
      onSelectionChange={(key) => setTab(key === 'comments' ? 'comments' : 'posts')}
    >
      <ProfileCard>
        <ProfileCard.Cover url={profile.cover_url} is_own={profile.is_own} action={
          <ImageUploadButton
            label={t(profile.cover_url ? 'profile.change_cover' : 'profile.add_cover')}
            is_disabled={update.isPending}
            onUploaded={async (cover_url) => { await update.mutateAsync({ cover_url }) }}
          />
        } />
        <ProfileCard.Identity avatar={
          <ProfileCard.Avatar profile={profile} action={
            <ImageUploadButton
              label={t('profile.change_avatar')}
              container_className="size-full"
              className="group/avatar-upload size-full min-w-0 rounded-avatar bg-transparent p-0 text-white shadow-none transition-colors hover:bg-black/50 focus-visible:bg-black/50 [@media(hover:none)]:bg-black/35"
              is_disabled={update.isPending}
              onUploaded={async (avatar_url) => { await update.mutateAsync({ avatar_url }) }}
            >
              <BaseIcon name="camera" style="line" size={28} className="opacity-0 transition-opacity group-hover/avatar-upload:opacity-100 group-focus-visible/avatar-upload:opacity-100 [@media(hover:none)]:opacity-100" />
            </ImageUploadButton>
          } />
        } actions={
          profile.is_own ? <OwnerActions profile={profile} /> :
            <FollowButton variant="primary" size="md" target_type="user" target_id={profile.user_id} is_following={profile.is_following} is_own={false} />
        } />
        <ProfileCard.Content>
          <ProfileCard.Name profile={profile} aside={<ProfileStatus profile={profile} />} />
          <ProfileCard.Reputation profile={profile} />
          <ProfileCard.Bio profile={profile} />
          <ProfileCard.Counts profile={profile} address={address} />
          <ProfileCard.Badges badges={profile.badges} />
        </ProfileCard.Content>
        <ProfileCard.Navigation><ProfileCard.Tabs /></ProfileCard.Navigation>
      </ProfileCard>
      <FeedSortMenu sort={sort} onChange={setSort} />
      <ProfileActivityFeed activity={activity} is_own={profile.is_own} />
    </Tabs>
  )
}

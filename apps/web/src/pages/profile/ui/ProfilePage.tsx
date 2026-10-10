import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { toArticleCard } from '@/entities/article'
import type { ArticleCardModel } from '@/entities/article'
import { ArticleCard } from '@/entities/article'
import { commentKeys, getUserComments } from '@/entities/comment'
import { getProfileArticles, profileKeys, useProfile } from '@/entities/profile'
import type { ProfileArticleDto, ProfileArticleStatus } from '@/entities/profile'
import { useUpdateProfile } from '@/features/edit-profile'
import { FollowButton } from '@/features/follow'
import { PromoteDialog } from '@/features/promote-article'
import { ShareButton } from '@/features/share-article'
import { ImageUploadButton } from '@/features/upload-media'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { Button, EmptyState, ErrorState } from '@/shared/ui'
import { ReachBanner } from '@/widgets/article-view'
import { ArticleOverflowMenu } from '@/widgets/feed'
import { OwnerActions, ProfileCard, ProfileListCard, ReputationHint, UserCommentRow } from '@/widgets/profile-card'
import { useShellStore } from '@/widgets/shell'

type ProfileArticle = ArticleCardModel & { status: ProfileArticleStatus }

function toProfileArticle(dto: ProfileArticleDto): ProfileArticle {
  const card = toArticleCard({ ...dto, published_at: dto.published_at ?? new Date(0).toISOString() })
  return { ...card, status: dto.status, time_label: dto.published_at ? card.time_label : '' }
}

export default function ProfilePage() {
  const { slug = '' } = useParams()
  const { t } = useT()
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const setArticleTopicId = useShellStore((state) => state.setArticleTopicId)
  const profile_query = useProfile(slug)
  const profile = profile_query.data
  const [tab, setTab] = useState<'posts' | 'comments'>('posts')
  const [sort, setSort] = useState<'fresh' | 'popular'>('fresh')
  const update = useUpdateProfile()

  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
    setArticleTopicId(null)
  }, [setHeaderCenter, setArticleTopicId])

  const articles = useInfiniteQuery({
    queryKey: profileKeys.articles(slug, sort),
    queryFn: ({ pageParam, signal }) => getProfileArticles(slug, sort, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    enabled: Boolean(profile) && tab === 'posts',
  })
  const comments = useInfiniteQuery({
    queryKey: commentKeys.byAuthor(profile?.user_id ?? '', sort),
    queryFn: ({ pageParam, signal }) => getUserComments(profile?.user_id ?? '', sort, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    enabled: Boolean(profile) && tab === 'comments',
  })

  if (profile_query.isPending) return <ProfileCard.Skeleton />
  if (profile_query.isError || !profile) {
    const missing = profile_query.error instanceof ApiError && profile_query.error.status === 404
    return missing ? <EmptyState title={t('profile.not_found')} /> : <ErrorState title={t('error.unknown')} onRetry={() => void profile_query.refetch()} />
  }

  const address = profile.slug ?? String(profile.public_number)
  const article_items = (articles.data?.pages ?? []).flatMap((page) => page.items.map(toProfileArticle))
  const comment_items = (comments.data?.pages ?? []).flatMap((page) => page.items)
  const list = tab === 'posts' ? articles : comments
  const saveCover = (url: string) => {
    update.mutate({
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      cover_url: url,
      slug: profile.slug,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ProfileCard>
        <ProfileCard.Cover
          url={profile.cover_url}
          is_own={profile.is_own}
          action={
            <ImageUploadButton label={t(profile.cover_url ? 'profile.change_cover' : 'profile.add_cover')} onUploaded={saveCover} />
          }
        />
        <div className="flex flex-wrap items-end gap-3 px-4">
          <ProfileCard.Avatar profile={profile} />
          <div className="ml-auto flex flex-wrap justify-end gap-2 max-[1199px]:order-last max-[1199px]:w-full">
            <ProfileCard.Actions>
              {profile.is_own ? (
                <OwnerActions profile={profile} />
              ) : (
                <FollowButton target_type="user" target_id={profile.user_id} is_following={profile.is_following} is_own={false} />
              )}
            </ProfileCard.Actions>
          </div>
        </div>
        <div className="flex flex-col gap-3 px-4 pb-4 pt-3">
          <ProfileCard.Name profile={profile} aside={profile.is_own ? <ReputationHint /> : null} />
          <ProfileCard.Reputation profile={profile} />
          <ProfileCard.Bio profile={profile} />
          <ProfileCard.Counts profile={profile} address={address} />
          <ProfileCard.Badges badges={profile.badges} />
          <ProfileCard.Tabs tab={tab} onChange={setTab} />
        </div>
      </ProfileCard>
      <ProfileListCard.Sort sort={sort} onChange={setSort} />
      <ProfileListCard>
        <ProfileListCard.Reach>
          {profile.is_own && tab === 'posts' && article_items[0] ? (
            <ReachBanner action={<PromoteDialog article_id={article_items[0].id} />} />
          ) : null}
        </ProfileListCard.Reach>
        {list.isPending ? <ProfileCard.Skeleton /> : null}
        {list.isError ? <ErrorState title={t('error.unknown')} onRetry={() => void list.refetch()} /> : null}
        {tab === 'posts' && !articles.isPending ? (
          article_items.length === 0 ? (
            <EmptyState title={t('profile.posts_empty')} />
          ) : (
            <div className="flex flex-col gap-4 p-4">
              {article_items.map((article) => (
                <div key={article.id} className="flex flex-col gap-2">
                  {article.status !== 'published' ? <p className="text-xs text-muted">{t(`profile.status.${article.status}`)}</p> : null}
                  <ArticleCard article={article}>
                    <ArticleCard.Header
                      follow={
                        <FollowButton
                          target_type="user"
                          target_id={article.author.user_id}
                          is_following={article.is_following ?? profile.is_following}
                          is_own={profile.is_own}
                        />
                      }
                      menu={<ArticleOverflowMenu article_id={article.id} slug={article.slug} is_own={profile.is_own} />}
                    />
                    <ArticleCard.Title />
                    <ArticleCard.Excerpt />
                    <ArticleCard.Image />
                    <ArticleCard.Actions share={<ShareButton slug={article.slug} />} />
                  </ArticleCard>
                </div>
              ))}
            </div>
          )
        ) : null}
        {tab === 'comments' && !comments.isPending ? (
          comment_items.length === 0 ? (
            <EmptyState title={t('profile.comments_empty')} />
          ) : (
            <ul className="px-4">
              {comment_items.map((comment) => (
                <UserCommentRow key={comment.id} comment={comment} />
              ))}
            </ul>
          )
        ) : null}
        {list.hasNextPage ? (
          <div className="flex justify-center p-4">
            <Button variant="ghost" onPress={() => void list.fetchNextPage()} isDisabled={list.isFetchingNextPage}>
              {t('common.more')}
            </Button>
          </div>
        ) : null}
      </ProfileListCard>
    </div>
  )
}

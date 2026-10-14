import { BookmarkControl } from '@/features/bookmark'
import { FollowButton } from '@/features/follow'
import { ReactionControl } from '@/features/react'
import { ArticleModerationActions } from '@/features/moderate-content'
import { ShareButton } from '@/features/share-article'
import { useT } from '@/shared/i18n'
import { ArticleSkeleton, ArticleUnavailable, ArticleView } from '@/widgets/article-view'
import { ArticleOverflowMenu } from '@/widgets/feed'
import { useArticlePage } from '../model/useArticlePage.ts'
import { ArticleDiscussion } from './ArticleDiscussion.tsx'

export default function ArticlePage() {
  const { t } = useT()
  const page = useArticlePage()
  if (page.query.isPending) return <ArticleSkeleton />
  if (page.query.isError || !page.query.data || page.query.data.status !== 'ok') {
    return (
      <ArticleUnavailable
        status={page.query.data?.status === 'members_only' ? 'members_only' : 'unavailable'}
      />
    )
  }

  const loaded = page.query.data.article
  if (loaded.status === 'hidden' && !loaded.is_own && !page.is_admin) {
    return <ArticleUnavailable status="unavailable" />
  }
  return (
    <div className="flex flex-col gap-4 max-w-[var(--shell-content-width,640px)] mx-auto">
      <ArticleView article={loaded}>
        <ArticleView.Byline
          follow={
            <FollowButton
              target_type="user"
              target_id={loaded.author.user_id}
              is_following={false}
              is_own={loaded.is_own}
            />
          }
          menu={
            <ArticleOverflowMenu article_id={loaded.id} slug={loaded.slug} is_own={loaded.is_own} />
          }
        />
        {loaded.status === 'hidden' ? (
          <p className="text-sm text-accent">{t('article.hidden_by_moderator')}</p>
        ) : null}
        <ArticleView.Title />
        <ArticleView.Body />
        <ArticleView.Reactions>
          <ReactionControl
            target_type="article"
            target_id={loaded.id}
            slug={loaded.slug}
            counts={loaded.reaction_counts}
            my_reaction={page.mine}
          />
        </ArticleView.Reactions>
        <ArticleView.Actions
          bookmark={
            <BookmarkControl
              article_id={loaded.id}
              slug={loaded.slug}
              count={loaded.bookmark_count}
              is_bookmarked={page.is_bookmarked}
            />
          }
          share={<ShareButton slug={loaded.slug} />}
        />
      </ArticleView>
      {page.is_moderation ? (
        <div className="px-4">
          <ArticleModerationActions article_id={loaded.id} status={loaded.status} />
        </div>
      ) : null}
      <ArticleView.Discussion>
        <ArticleDiscussion article={loaded} />
      </ArticleView.Discussion>
    </div>
  )
}

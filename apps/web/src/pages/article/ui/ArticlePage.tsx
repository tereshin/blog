import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useParams } from 'react-router'
import { articleKeys, getArticle, useArticleStates } from '@/entities/article'
import { useViewer } from '@/entities/session'
import { FollowButton } from '@/features/follow'
import { ReactionControl } from '@/features/react'
import { ShareButton } from '@/features/share-article'
import { useT } from '@/shared/i18n'
import { readFeedReturn } from '@/shared/lib'
import { ArticleSkeleton, ArticleUnavailable, ArticleView } from '@/widgets/article-view'
import { ArticleOverflowMenu, markSeenArticle } from '@/widgets/feed'
import { useShellStore } from '@/widgets/shell'
import { useArticleLive } from '../model/useArticleLive.ts'
import { ArticleDiscussion } from './ArticleDiscussion.tsx'

// Страница статьи — композиция: полный текст, реакции и чтение обсуждения внутри того же каркаса.
export default function ArticlePage() {
  const { t } = useT()
  const { slug = '' } = useParams()
  const { viewer, is_admin } = useViewer()
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const setArticleTopicId = useShellStore((state) => state.setArticleTopicId)
  const query = useQuery({
    queryKey: articleKeys.detail(slug),
    queryFn: ({ signal }) => getArticle(slug, signal),
  })
  const article = query.data?.status === 'ok' ? query.data.article : null
  useArticleLive(slug, article?.id ?? null)
  useEffect(() => {
    if (!article) return
    const saved = readFeedReturn()
    if (!saved) return
    void markSeenArticle(saved.feed_key, article.id)
  }, [article])
  const viewer_states = useArticleStates(article ? [article.id] : [], viewer.status === 'member')
  const mine = article ? (viewer_states.get(article.id)?.my_reaction ?? null) : null

  useEffect(() => {
    setHeaderCenter({ kind: 'back', title: article?.title ?? '' })
    setArticleTopicId(article?.topic.id ?? null)
    return () => {
      setHeaderCenter({ kind: 'empty' })
      setArticleTopicId(null)
    }
  }, [article, setHeaderCenter, setArticleTopicId])

  if (query.isPending) return <ArticleSkeleton />
  if (query.isError || !query.data || query.data.status !== 'ok') {
    return (
      <ArticleUnavailable
        status={query.data?.status === 'members_only' ? 'members_only' : 'unavailable'}
      />
    )
  }

  const loaded = query.data.article
  if (loaded.status === 'hidden' && !loaded.is_own && !is_admin) {
    return <ArticleUnavailable status="unavailable" />
  }
  return (
    <div className="flex flex-col gap-4">
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
        <ArticleView.Reactions share={<ShareButton slug={loaded.slug} />}>
          <ReactionControl
            target_type="article"
            target_id={loaded.id}
            slug={loaded.slug}
            counts={loaded.reaction_counts}
            my_reaction={mine}
          />
        </ArticleView.Reactions>
      </ArticleView>
      <ArticleView.Discussion>
        <ArticleDiscussion article={loaded} />
      </ArticleView.Discussion>
    </div>
  )
}

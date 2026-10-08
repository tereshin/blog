import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useParams } from 'react-router'
import { articleKeys, getArticle, useArticleStates } from '@/entities/article'
import { CommentThread, useComments } from '@/entities/comment'
import { useViewer } from '@/entities/session'
import { ReactionControl } from '@/features/react'
import { ShareIcon } from '@/shared/ui'
import { ArticleSkeleton, ArticleUnavailable, ArticleView, ReachBanner } from '@/widgets/article-view'
import { useShellStore } from '@/widgets/shell'
import { useArticleLive } from '../model/useArticleLive.ts'

// Страница статьи — композиция: полный текст, реакции и чтение обсуждения внутри того же каркаса.
export default function ArticlePage() {
  const { slug = '' } = useParams()
  const { viewer } = useViewer()
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const setArticleTopicId = useShellStore((state) => state.setArticleTopicId)
  const query = useQuery({
    queryKey: articleKeys.detail(slug),
    queryFn: ({ signal }) => getArticle(slug, signal),
  })
  const article = query.data?.status === 'ok' ? query.data.article : null
  useArticleLive(slug, article?.id ?? null)
  const comments = useComments(article?.id ?? null)
  const viewer_states = useArticleStates(article ? [article.id] : [], viewer.status === 'member')
  const mine = article ? viewer_states.get(article.id)?.my_reaction ?? null : null

  useEffect(() => {
    setHeaderCenter({ kind: 'back', title: article?.title ?? '' })
    setArticleTopicId(article?.topic.id ?? null)
    return () => {
      setHeaderCenter({ kind: 'pill' })
      setArticleTopicId(null)
    }
  }, [article, setHeaderCenter, setArticleTopicId])

  if (query.isPending) return <ArticleSkeleton />
  if (query.isError || !query.data || query.data.status !== 'ok') {
    return <ArticleUnavailable status={query.data?.status === 'members_only' ? 'members_only' : 'unavailable'} />
  }

  const loaded = query.data.article
  return (
    <ArticleView article={loaded}>
      {loaded.is_own ? (
        <ArticleView.Reach>
          <ReachBanner />
        </ArticleView.Reach>
      ) : null}
      <ArticleView.Byline />
      <ArticleView.Title />
      <ArticleView.Body />
      <ArticleView.Reactions share={<ShareIcon width={18} height={18} />}>
        <ReactionControl
          target_type="article"
          target_id={loaded.id}
          slug={loaded.slug}
          counts={loaded.reaction_counts}
          my_reaction={mine}
        />
      </ArticleView.Reactions>
      <ArticleView.Discussion>
        <CommentThread
          state={comments}
          renderReactions={(comment) => (
            <ReactionControl
              target_type="comment"
              target_id={comment.id}
              slug={loaded.slug}
              counts={comment.reaction_counts}
              my_reaction={comment.my_reaction}
            />
          )}
        />
      </ArticleView.Discussion>
    </ArticleView>
  )
}

import { getModerationReturnTo } from '@/entities/admin'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useParams, useSearchParams, useLocation } from 'react-router'
import { articleKeys, getArticle, useArticleStates } from '@/entities/article'
import { useViewer } from '@/entities/session'
import { readFeedReturn } from '@/shared/lib'
import { markSeenArticle } from '@/widgets/feed'
import { useShellStore } from '@/widgets/shell'
import { useArticleLive } from './useArticleLive.ts'

export function useArticlePage() {
  const { slug = '' } = useParams()
  const [search_params] = useSearchParams()
  const location = useLocation()
  const { viewer, is_admin } = useViewer()
  const moderation_return_to =
    is_admin && search_params.get('from') === 'moderation'
      ? getModerationReturnTo(location.state)
      : undefined
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
  const is_bookmarked = article ? (viewer_states.get(article.id)?.is_bookmarked ?? false) : false

  useEffect(() => {
    setHeaderCenter({
      kind: 'back',
      title: article?.title ?? '',
      ...(moderation_return_to ? { to: moderation_return_to } : {}),
    })
    setArticleTopicId(article?.topic.id ?? null)
    return () => {
      setHeaderCenter({ kind: 'empty' })
      setArticleTopicId(null)
    }
  }, [article, moderation_return_to, setHeaderCenter, setArticleTopicId])

  return {
    query,
    article,
    is_admin,
    is_moderation: is_admin && search_params.get('from') === 'moderation',
    mine,
    is_bookmarked,
  }
}

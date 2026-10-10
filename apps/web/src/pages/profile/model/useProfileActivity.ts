import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toArticleCard, useArticleStates } from '@/entities/article'
import { commentKeys, getUserComments } from '@/entities/comment'
import { getProfileArticles, profileKeys } from '@/entities/profile'
import type { Profile, ProfileArticleDto } from '@/entities/profile'
import { useViewer } from '@/entities/session'

function toProfileArticle(dto: ProfileArticleDto) {
  const card = toArticleCard({
    ...dto,
    published_at: dto.published_at ?? new Date(0).toISOString(),
  })
  return { ...card, status: dto.status, time_label: dto.published_at ? card.time_label : '' }
}

export function useProfileActivity(slug: string, profile: Profile | undefined) {
  const [tab, setTab] = useState<'posts' | 'comments'>('posts')
  const [sort, setSort] = useState<'fresh' | 'popular'>('fresh')
  const { viewer } = useViewer()
  const articles = useInfiniteQuery({
    queryKey: profileKeys.articles(slug, sort),
    queryFn: ({ pageParam, signal }) => getProfileArticles(slug, sort, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    enabled: Boolean(profile) && tab === 'posts',
  })
  const comments = useInfiniteQuery({
    queryKey: commentKeys.byAuthor(profile?.user_id ?? '', sort),
    queryFn: ({ pageParam, signal }) =>
      getUserComments(profile?.user_id ?? '', sort, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    enabled: Boolean(profile) && tab === 'comments',
  })
  const article_items = (articles.data?.pages ?? []).flatMap((page) =>
    page.items.map(toProfileArticle),
  )
  const comment_items = (comments.data?.pages ?? []).flatMap((page) => page.items)
  const published_ids =
    tab === 'posts'
      ? article_items
          .filter((article) => article.status === 'published')
          .map((article) => article.id)
      : []
  const viewer_states = useArticleStates(published_ids, viewer.status === 'member')
  return {
    tab,
    setTab,
    sort,
    setSort,
    article_items,
    comment_items,
    viewer_states,
    list: tab === 'posts' ? articles : comments,
  }
}

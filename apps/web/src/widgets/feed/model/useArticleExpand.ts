import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { articleKeys, getArticle } from '@/entities/article'

export function useArticleExpand(slug: string, onExpanded?: (article_id: string) => void) {
  const [is_open, setOpen] = useState(false)
  const query = useQuery({
    queryKey: articleKeys.detail(slug),
    queryFn: ({ signal }) => getArticle(slug, signal),
    enabled: is_open,
  })
  const article = query.data?.status === 'ok' ? query.data.article : null

  useEffect(() => {
    if (is_open && article) onExpanded?.(article.id)
  }, [is_open, article, onExpanded])

  return {
    is_open,
    is_pending: query.isPending,
    is_error: query.isError,
    load: query.data ?? null,
    article,
    handleToggle: () => setOpen((open) => !open),
  }
}

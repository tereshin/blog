import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, Skeleton } from '@/shared/ui'
import { getArticle } from '../api/get-article.ts'
import { articleKeys } from '../model/article-keys.ts'
import { BlockRenderer } from './BlockRenderer.tsx'

type ArticleCardExpandProps = {
  slug: string
  /** Статья раскрыта в ленте: полоса просмотренного (US14) узнает об этом, адрес не меняется. */
  onExpanded?: (article_id: string) => void
}

/** «Показать полностью» дочитывает статью внутри карточки и не открывает её страницу. */
export function ArticleCardExpand({ slug, onExpanded }: ArticleCardExpandProps) {
  const { t } = useT()
  const [is_open, setOpen] = useState(false)
  const query = useQuery({
    queryKey: articleKeys.detail(slug),
    queryFn: ({ signal }) => getArticle(slug, signal),
    enabled: is_open,
  })

  const toggle = () => setOpen((open) => !open)
  const article = query.data?.status === 'ok' ? query.data.article : null

  useEffect(() => {
    if (is_open && article) onExpanded?.(article.id)
  }, [is_open, article, onExpanded])

  return (
    <div>
      <Button variant="ghost" size="sm" onPress={toggle} aria-expanded={is_open}>
        {t(is_open ? 'article.collapse' : 'article.expand')}
      </Button>
      {is_open && query.isPending ? (
        <div className="mt-3 flex flex-col gap-2" aria-busy="true" aria-label={t('article.expand_loading')}>
          <Skeleton />
          <Skeleton className="w-4/5" />
        </div>
      ) : null}
      {is_open && query.isError ? <p className="mt-3 text-sm text-danger">{t('article.expand_failed')}</p> : null}
      {is_open && query.data?.status === 'members_only' ? <p className="mt-3 text-sm text-muted">{t('article.visibility.members')}</p> : null}
      {is_open && query.data?.status === 'unavailable' ? <p className="mt-3 text-sm text-muted">{t('article.unavailable')}</p> : null}
      {is_open && article ? (
        <div className="mt-2">
          <BlockRenderer blocks={article.blocks} />
        </div>
      ) : null}
    </div>
  )
}

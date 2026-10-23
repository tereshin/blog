import { cva } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { BlockRenderer, Button, ChevronDownIcon, Skeleton } from '@/shared/ui'
import type { ArticleLoad, ArticleModel } from '../model/article-types.ts'
import { ArticleCard } from './ArticleCard.tsx'

const chevron_class = cva(undefined, {
  variants: { is_open: { true: 'rotate-180', false: undefined } },
})

type ArticleCardExpandProps = {
  has_more_content?: boolean
  is_open: boolean
  is_pending?: boolean
  is_error?: boolean
  load?: ArticleLoad | null
  article?: ArticleModel | null
  onToggle: () => void
  children?: ReactNode
}

/** «Показать полностью» раскрывает тело статьи внутри карточки и не открывает её страницу. */
export function ArticleCardExpand({
  has_more_content = true,
  is_open,
  is_pending = false,
  is_error = false,
  load = null,
  article = null,
  onToggle,
  children,
}: ArticleCardExpandProps) {
  const { t } = useT()
  if (!has_more_content) return <>{children}</>

  return (
    <>
      {is_open && article ? (
        <div className="px-4 lg:px-5 pt-2">
          <BlockRenderer blocks={article.blocks} />
        </div>
      ) : children}
      <ArticleCard.Expand>
        <div>
          <Button variant="ghost" className="h-auto min-w-0 gap-1 rounded-none p-0 text-base font-normal text-accent" onPress={onToggle} aria-expanded={is_open}>
            {t(is_open ? 'article.collapse' : 'article.expand')}
            <ChevronDownIcon width={16} height={16} className={chevron_class({ is_open })} />
          </Button>
          {is_open && is_pending ? (
            <div className="mt-3 flex flex-col gap-2" aria-busy="true" aria-label={t('article.expand_loading')}>
              <Skeleton />
              <Skeleton className="w-4/5" />
            </div>
          ) : null}
          {is_open && is_error ? <p className="mt-3 text-sm text-danger">{t('article.expand_failed')}</p> : null}
          {is_open && load?.status === 'members_only' ? <p className="mt-3 text-sm text-muted">{t('article.visibility.members')}</p> : null}
          {is_open && load?.status === 'unavailable' ? <p className="mt-3 text-sm text-muted">{t('article.unavailable')}</p> : null}
        </div>
      </ArticleCard.Expand>
    </>
  )
}

import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import { cn, formatCount } from '@/shared/lib'
import { AnimatedCount, BookmarkIcon, Card, CommentIcon, EyeIcon, ShareIcon } from '@/shared/ui'
import type { ArticleCardModel } from '../model/article-types.ts'

type ArticleActionsProps = {
  article: Pick<ArticleCardModel, 'href' | 'comment_count' | 'bookmark_count' | 'view_count'>
  bookmark?: ReactNode
  share?: ReactNode
  className?: string
}

/** Общая панель действий карточки и полной статьи. */
export function ArticleActions({ article, bookmark, share, className }: ArticleActionsProps) {
  const { t, locale } = useT()
  return (
    <Card.Content className={cn('flex flex-row items-center gap-4 px-4 pb-3 pt-2 text-base text-muted', className)}>
      <Link
        to={`${article.href}#comments`}
        aria-label={t('article.comments', { count: article.comment_count, value: formatCount(article.comment_count, locale) })}
        className="action-control outline-offset-2"
      >
        <span className="action-control__icon"><CommentIcon className="size-5" /></span>
        <AnimatedCount value={article.comment_count} locale={locale} />
      </Link>
      {bookmark ?? (
        <span className="action-control">
          <span className="action-control__icon"><BookmarkIcon className="size-5" /></span>
          <AnimatedCount value={article.bookmark_count} locale={locale} />
        </span>
      )}
      {share ?? <ShareIcon className="size-5" />}
      <span
        className="ml-auto flex items-center gap-1 font-medium"
        aria-label={t('article.views', { count: article.view_count, value: formatCount(article.view_count, locale) })}
      >
        <EyeIcon className="size-5" />
        <AnimatedCount value={article.view_count} locale={locale} />
      </span>
    </Card.Content>
  )
}

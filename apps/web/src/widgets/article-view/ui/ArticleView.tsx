import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { BlockRenderer } from '@/entities/article'
import type { ArticleModel } from '@/entities/article'
import { useT } from '@/shared/i18n'
import { formatTime } from '@/shared/lib'
import { Avatar } from '@/shared/ui'
import { ArticleViewContext, useArticleViewModel } from './article-view-context.ts'

type ArticleViewRootProps = { article: ArticleModel; children: ReactNode }

function ArticleViewRoot({ article, children }: ArticleViewRootProps) {
  return (
    <ArticleViewContext value={article}>
      <article className="flex flex-col gap-4 px-4 py-4">{children}</article>
    </ArticleViewContext>
  )
}

function Reach({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <div>{children}</div>
}

type BylineProps = { follow?: ReactNode; menu?: ReactNode }

function Byline({ follow, menu }: BylineProps) {
  const article = useArticleViewModel()
  return (
    <div className="flex items-center gap-3">
      <Link to={article.author.href} className="shrink-0 rounded-avatar outline-offset-2" aria-label={article.author.display_name}>
        <Avatar src={article.author.avatar_url} name={article.author.display_name} size="md" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link to={article.author.href} className="truncate text-sm font-medium outline-offset-2 hover:underline">
          {article.author.display_name}
        </Link>
        <div className="flex min-w-0 items-center gap-1 text-xs text-muted">
          <Link to={article.topic.href} className="truncate outline-offset-2 hover:underline">
            {article.topic.title}
          </Link>
          {article.published_at ? (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={article.published_at}>{formatTime(article.published_at)}</time>
            </>
          ) : null}
        </div>
      </div>
      {follow}
      {menu}
    </div>
  )
}

function Title() {
  const article = useArticleViewModel()
  return <h1 className="text-2xl font-semibold leading-snug">{article.title}</h1>
}

function Body() {
  const article = useArticleViewModel()
  return <BlockRenderer blocks={article.blocks} />
}

type ReactionsProps = { children?: ReactNode; share?: ReactNode }

function Reactions({ children, share }: ReactionsProps) {
  const { t } = useT()
  return (
    <div className="flex items-center justify-between gap-3 border-t border-separator pt-3">
      <div className="min-w-0">{children}</div>
      <div className="shrink-0" aria-label={t('article.share')}>
        {share}
      </div>
    </div>
  )
}

function Discussion({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <div className="border-t border-separator pt-2">{children}</div>
}

export const ArticleView = Object.assign(ArticleViewRoot, { Reach, Byline, Title, Body, Reactions, Discussion })

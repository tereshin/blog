import type { ReactNode } from 'react'
import { ArticleActions, ArticleByline, BlockRenderer } from '@/entities/article'
import type { ArticleModel } from '@/entities/article'
import { Card } from '@/shared/ui'
import { ArticleViewContext, useArticleViewModel } from './article-view-context.ts'

type ArticleViewRootProps = { article: ArticleModel; children: ReactNode }

/** Карточка текста. Обсуждение — соседняя карточка `ArticleView.Discussion`, не внутри этой. */
function ArticleViewRoot({ article, children }: ArticleViewRootProps) {
  return (
    <ArticleViewContext value={article}>
      <Card className="gap-0 overflow-visible">
        <article className="flex flex-col gap-3 px-5 py-4">{children}</article>
      </Card>
    </ArticleViewContext>
  )
}

type BylineProps = { follow?: ReactNode; menu?: ReactNode }

function Byline({ follow, menu }: BylineProps) {
  const article = useArticleViewModel()
  return (
    <ArticleByline
      author={article.author}
      topic={article.topic}
      published_at={article.published_at}
      follow={follow}
      menu={menu}
    />
  )
}

function Title() {
  const article = useArticleViewModel()
  return <h1 className="text-xl font-semibold leading-snug tracking-[-0.005em]">{article.title}</h1>
}

function Body() {
  const article = useArticleViewModel()
  return (
    <div className="text-md leading-7 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
      <BlockRenderer blocks={article.blocks} />
    </div>
  )
}

function Reactions({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <div className="min-w-0 pt-1">{children}</div>
}

function Actions({ bookmark, share }: { bookmark?: ReactNode; share?: ReactNode }) {
  const article = useArticleViewModel()
  return (
    <ArticleActions
      article={{ ...article, href: `/p/${encodeURIComponent(article.slug)}` }}
      bookmark={bookmark}
      share={share}
      className="-mx-5 -mb-4"
    />
  )
}

/** Отдельная карточка обсуждения под текстом. Якорь `#comments` для ссылок из ленты. */
function Discussion({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <section id="comments" className="scroll-mt-16">
      <Card className="gap-0">
        <div className="px-5 py-4">{children}</div>
      </Card>
    </section>
  )
}

export const ArticleView = Object.assign(ArticleViewRoot, {
  Byline,
  Title,
  Body,
  Reactions,
  Actions,
  Discussion,
})

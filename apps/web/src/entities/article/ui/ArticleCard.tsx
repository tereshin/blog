import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { Avatar, Card, Skeleton } from '@/shared/ui'
import type { ArticleCardModel } from '../model/article-types.ts'
import { ArticleByline } from './ArticleByline.tsx'
import { ArticleActions } from './ArticleActions.tsx'
import { ArticleCardContext, useArticleCardModel } from './article-card-context.ts'

type ArticleCardRootProps = { article: ArticleCardModel; children: ReactNode; className?: string }

/** Корень карточки: передаёт статью частям через контекст, части собираются в нужном порядке (FR-060). */
function ArticleCardRoot({ article, children, className }: ArticleCardRootProps) {
  return (
    <ArticleCardContext value={article}>
      <Card role="article" aria-labelledby={`article-title-${article.id}`} className={cn('gap-0 overflow-visible', className)}>
        {children}
      </Card>
    </ArticleCardContext>
  )
}

/** Полоса над автором, отделённая чертой (например, «Скрыто N просмотренных постов» у первой карточки ленты). */
function Lead({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <div className="border-b border-separator px-5 py-3">{children}</div>
}

type HeaderProps = {
  /** Слот «Подписаться» справа (только у чужого автора). */
  follow?: ReactNode
  /** Слот меню «…». */
  menu?: ReactNode
}

function Header({ follow, menu }: HeaderProps) {
  const article = useArticleCardModel()
  return (
    <Card.Header className="flex flex-row items-center overflow-visible px-5 pt-4">
      <ArticleByline
        author={article.author}
        topic={article.topic}
        published_at={article.published_at}
        time_label={article.time_label}
        follow={follow}
        menu={menu}
      />
    </Card.Header>
  )
}

function Title() {
  const article = useArticleCardModel()
  return (
    <Card.Content className="px-5 pb-0 pt-3">
      <h2 id={`article-title-${article.id}`} className="text-xl font-semibold leading-snug tracking-[-0.005em]">
        <Link to={article.href} className="text-foreground outline-offset-2 hover:underline">
          {article.title}
        </Link>
      </h2>
    </Card.Content>
  )
}

function Excerpt() {
  const article = useArticleCardModel()
  if (!article.excerpt) return null
  return (
    <Card.Content className="px-5 pb-0 pt-2">
      <p className="whitespace-pre-line break-words text-md leading-[1.6] text-foreground">{article.excerpt}</p>
    </Card.Content>
  )
}

/** Первое изображение статьи; без него часть не рендерится. Размеры заданы, чтобы лента не «прыгала». */
function Image() {
  const article = useArticleCardModel()
  if (!article.first_image_url) return null
  return (
    <Card.Content className="px-5 pb-0 pt-3">
      <img
        src={article.first_image_url}
        alt=""
        loading="lazy"
        decoding="async"
        width={720}
        height={405}
        className="aspect-video w-full rounded-2xl bg-surface-secondary object-cover"
      />
    </Card.Content>
  )
}

/** Слот «Показать полностью» / «Свернуть» и области раскрытого текста. */
function Expand({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <Card.Content className="px-5 pb-0 pt-2">{children}</Card.Content>
}

/** Слот ряда реакций. */
function Reactions({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <Card.Content className="px-5 pb-0 pt-3">{children}</Card.Content>
}

type ActionsProps = {
  /** Кнопка закладки; число закладок показывается рядом. */
  bookmark?: ReactNode
  share?: ReactNode
}

function Actions({ bookmark, share }: ActionsProps) {
  const article = useArticleCardModel()
  return <ArticleActions article={article} bookmark={bookmark} share={share} />
}

/** Одна строка: маленький аватар и начало самого обсуждаемого комментария; без комментария не рендерится (FR-064). */
function CommentPeek() {
  const article = useArticleCardModel()
  const { t } = useT()
  const comment = article.top_comment
  if (!comment) return null
  return (
    <Card.Footer className="border-t border-separator px-5 pt-3">
      <Link
        to={`${article.href}#comments`}
        aria-label={t('article.top_comment')}
        className="flex w-full min-w-0 items-center gap-2 rounded-md text-base outline-offset-2 hover:text-foreground"
      >
        <Avatar src={comment.author_avatar_url} name={comment.author_name} size="sm" className="size-6 shrink-0" />
        <span className="truncate text-muted">{comment.excerpt}</span>
      </Link>
    </Card.Footer>
  )
}

/** Заготовка карточки на время загрузки: те же отступы, высота близка к настоящей. */
function ArticleCardSkeleton() {
  return (
    <Card aria-hidden="true" className="gap-0">
      <Card.Header className="flex flex-row items-center gap-3">
        <Skeleton shape="circle" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </Card.Header>
      <Card.Content className="flex flex-col gap-2 pb-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </Card.Content>
    </Card>
  )
}

export const ArticleCard = Object.assign(ArticleCardRoot, {
  Lead,
  Header,
  Title,
  Excerpt,
  Image,
  Expand,
  Reactions,
  Actions,
  CommentPeek,
  Skeleton: ArticleCardSkeleton,
})

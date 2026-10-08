import { Link } from 'react-router'
import { useFirstArticle } from '@/entities/article'
import { useT } from '@/shared/i18n'
import { ArrowLeftIcon } from '@/shared/ui'
import { getReturnTarget } from '../lib/feed-return.ts'
import { useShellStore } from '../model/useShellStore.ts'

/**
 * Пилюля в центре шапки: название первой карточки «Популярного», вторичного вида, в одну строку.
 * Пока данных нет — скрыта. Это ссылка, а не поле ввода.
 */
function HeaderPill() {
  const article = useFirstArticle('popular')
  if (!article) return null
  return (
    <Link
      to={article.href}
      className="block min-w-0 max-w-md truncate rounded-pill bg-surface-secondary px-4 py-1.5 text-sm text-muted outline-offset-2 hover:text-foreground"
    >
      {article.title}
    </Link>
  )
}

/** «Назад» ведёт в сохранённую ленту или в «Свежее», если статью открыли прямой ссылкой. */
function HeaderBack({ title }: { title: string }) {
  const { t } = useT()
  const target = getReturnTarget()
  return (
    <div className="flex min-w-0 max-w-xl items-center gap-1">
      <Link
        to={target.path}
        aria-label={t('header.back')}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-foreground outline-offset-2 hover:bg-surface-secondary"
      >
        <ArrowLeftIcon width={18} height={18} />
      </Link>
      <span className="min-w-0 truncate text-sm font-medium">{title}</span>
    </div>
  )
}

/** Центр шапки по режиму из стора. Поиск подключается своим сценарием. */
export function HeaderCenter() {
  const header_center = useShellStore((state) => state.header_center)
  switch (header_center.kind) {
    case 'pill':
      return <HeaderPill />
    case 'search':
      return null
    case 'back':
      return <HeaderBack title={header_center.title} />
  }
}

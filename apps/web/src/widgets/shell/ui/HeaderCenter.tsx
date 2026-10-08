import { Link } from 'react-router'
import { useFirstArticle } from '@/entities/article'
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

/** Центр шапки по режиму из стора. Поиск (US3) и «назад» (US11) подключаются своими сценариями. */
export function HeaderCenter() {
  const header_center = useShellStore((state) => state.header_center)
  switch (header_center.kind) {
    case 'pill':
      return <HeaderPill />
    case 'search':
      return null
    case 'back':
      return <span className="min-w-0 truncate text-sm font-medium">{header_center.title}</span>
  }
}

import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import { ArrowLeftIcon } from '@/shared/ui'
import { getReturnTarget } from '../lib/feed-return.ts'
import { useShellStore } from '../model/useShellStore.ts'

/** «Назад» ведёт в сохранённую ленту или в «Свежее», если статью открыли прямой ссылкой. */
function HeaderBack({ title }: { title: string }) {
  const { t } = useT()
  const target = getReturnTarget()
  return (
    <div className="flex min-w-0 w-full max-w-xl items-center gap-1">
      <Link
        to={target.path}
        aria-label={t('header.back')}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-foreground outline-offset-2 hover:bg-surface-secondary"
      >
        <ArrowLeftIcon width={18} height={18} />
      </Link>
      <span title={title} className="min-w-0 truncate text-sm font-medium">
        {title}
      </span>
    </div>
  )
}

/** Центр шапки по режиму из стора. Пустой режим ничего не рисует. */
export function HeaderCenter() {
  const header_center = useShellStore((state) => state.header_center)
  switch (header_center.kind) {
    case 'empty':
      return null
    case 'search':
      return null // Поиск поверх шапки рендерит SiteHeader, независимо от слота center.
    case 'back':
      return <HeaderBack title={header_center.title} />
  }
}

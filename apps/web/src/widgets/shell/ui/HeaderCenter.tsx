import { useShellStore } from '../model/useShellStore.ts'
import { HeaderBackLink } from './HeaderBackLink.tsx'

function HeaderBack({ title, show_link }: { title: string; show_link: boolean }) {
  return (
    <div className="flex min-w-0 w-full max-w-xl items-center gap-1">
      {show_link ? <HeaderBackLink /> : null}
      <span title={title} className="min-w-0 truncate text-sm font-medium">
        {title}
      </span>
    </div>
  )
}

type HeaderCenterProps = {
  /** На узком экране ссылка «Назад» уже стоит слева, в центре остаётся только название. */
  show_link?: boolean
}

/** Центр шапки по режиму из стора. Пустой режим ничего не рисует. */
export function HeaderCenter({ show_link = true }: HeaderCenterProps) {
  const header_center = useShellStore((state) => state.header_center)
  switch (header_center.kind) {
    case 'empty':
      return null
    case 'search':
      return null // Поиск поверх шапки рендерит SiteHeader, независимо от слота center.
    case 'back':
      return <HeaderBack title={header_center.title} show_link={show_link} />
  }
}

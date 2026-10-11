import { useShellStore } from '../model/useShellStore.ts'
import { HeaderBackLink } from './HeaderBackLink.tsx'

function HeaderBack({ title }: { title: string }) {
  return (
    <div className="flex min-w-0 w-full max-w-xl items-center gap-1">
      <HeaderBackLink />
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

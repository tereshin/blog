import { useShellStore } from '../model/useShellStore.ts'
import { HeaderBackLink } from './HeaderBackLink.tsx'

/** Центр шапки по режиму из стора. Пустой режим ничего не рисует. */
export function HeaderCenter() {
  const header_center = useShellStore((state) => state.header_center)
  switch (header_center.kind) {
    case 'empty':
      return null
    case 'search':
      return null // Поиск поверх шапки рендерит SiteHeader, независимо от слота center.
    case 'back':
      return <HeaderBackLink />
  }
}

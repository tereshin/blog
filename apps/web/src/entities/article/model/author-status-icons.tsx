import { createContext, use } from 'react'
import type { ReactNode } from 'react'
import type { ProfileStatusIcon } from '@blog/contracts'

const AuthorStatusIconsContext = createContext<readonly ProfileStatusIcon[]>([])

type AuthorStatusIconsProviderProps = {
  icons: readonly ProfileStatusIcon[]
  children: ReactNode
}

/** Каталог иконок статуса. Пока провайдер не подставил настройки площадки, иконка не показывается. */
export function AuthorStatusIconsProvider({ icons, children }: AuthorStatusIconsProviderProps) {
  return <AuthorStatusIconsContext value={icons}>{children}</AuthorStatusIconsContext>
}

export function useAuthorStatusIcon(status_icon_id: string | null | undefined): ProfileStatusIcon | null {
  const icons = use(AuthorStatusIconsContext)
  if (!status_icon_id) return null
  return icons.find((icon) => icon.id === status_icon_id) ?? null
}

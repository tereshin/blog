import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { Drawer } from '@/shared/ui'

type LeftNavDrawerProps = {
  is_open: boolean
  onOpenChange: (is_open: boolean) => void
  children: ReactNode
}

/** Левая навигация ниже 1200px: та же колонка, фокус и Escape — у панели HeroUI. */
export function LeftNavDrawer({ is_open, onOpenChange, children }: LeftNavDrawerProps) {
  const { t } = useT()
  return (
    <Drawer id="shell-nav" is_open={is_open} onOpenChange={onOpenChange} placement="left" aria-label={t('shell.navigation')}>
      <Drawer.Body>
        <nav aria-label={t('shell.navigation')}>{children}</nav>
      </Drawer.Body>
    </Drawer>
  )
}

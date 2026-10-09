import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { useMediaQuery } from '@/shared/lib'
import { Drawer } from '@/shared/ui'

type LeftNavDrawerProps = {
  is_open: boolean
  onOpenChange: (is_open: boolean) => void
  children: ReactNode
}

const DRAWER_QUERY = '(max-width: 767px)'

/** Левая навигация ниже 768px. От 768px столбец виден на месте, панель не монтируется. */
export function LeftNavDrawer({ is_open, onOpenChange, children }: LeftNavDrawerProps) {
  const { t } = useT()
  const is_drawer = useMediaQuery(DRAWER_QUERY)

  useEffect(() => {
    if (!is_drawer && is_open) onOpenChange(false)
  }, [is_drawer, is_open, onOpenChange])

  if (!is_drawer) return null

  return (
    <Drawer id="shell-nav" is_open={is_open} onOpenChange={onOpenChange} placement="left" aria-label={t('shell.navigation')}>
      <Drawer.Body>
        <nav aria-label={t('shell.navigation')}>{children}</nav>
      </Drawer.Body>
    </Drawer>
  )
}

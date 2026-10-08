import { Drawer as HeroDrawer } from '@heroui/react/drawer'
import type { ComponentProps, ReactNode } from 'react'

type DrawerProps = {
  is_open: boolean
  onOpenChange: (is_open: boolean) => void
  placement?: ComponentProps<typeof HeroDrawer.Content>['placement']
  'aria-label'?: string
  className?: string
  children: ReactNode
}

/** Боковая панель: открывается с кнопки, закрывается по Escape, держит фокус внутри. */
function DrawerRoot({ is_open, onOpenChange, placement = 'left', className, children, ...rest }: DrawerProps) {
  return (
    // Управляемая панель без кнопки-триггера внутри: корневой `Drawer` не нужен (он ждал бы триггер).
    <HeroDrawer.Backdrop isOpen={is_open} onOpenChange={onOpenChange}>
      <HeroDrawer.Content placement={placement}>
        <HeroDrawer.Dialog {...(className ? { className } : {})} aria-label={rest['aria-label']}>
          {children}
        </HeroDrawer.Dialog>
      </HeroDrawer.Content>
    </HeroDrawer.Backdrop>
  )
}

export const Drawer = Object.assign(DrawerRoot, {
  CloseTrigger: HeroDrawer.CloseTrigger,
  Header: HeroDrawer.Header,
  Heading: HeroDrawer.Heading,
  Body: HeroDrawer.Body,
  Footer: HeroDrawer.Footer,
})

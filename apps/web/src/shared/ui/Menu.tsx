import { Dropdown } from '@heroui/react/dropdown'
import type { ComponentProps, ReactNode } from 'react'

type MenuContentProps = Omit<ComponentProps<typeof Dropdown.Menu>, 'children'> & { children: ReactNode }

/** Меню действий: клавиатура, фокус и ARIA — от React Aria. */
function MenuContent({ children, ...rest }: MenuContentProps) {
  return (
    <Dropdown.Popover>
      <Dropdown.Menu {...rest}>{children}</Dropdown.Menu>
    </Dropdown.Popover>
  )
}

function MenuRoot(props: ComponentProps<typeof Dropdown>) {
  return <Dropdown {...props} />
}

export const Menu = Object.assign(MenuRoot, {
  Trigger: Dropdown.Trigger,
  Content: MenuContent,
  Item: Dropdown.Item,
  Section: Dropdown.Section,
})

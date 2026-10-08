import { Tabs as HeroTabs } from '@heroui/react/tabs'
import type { ComponentProps, ReactNode } from 'react'

type TabListProps = { 'aria-label': string; className?: string; children: ReactNode }

/** Список вкладок с прокруткой при нехватке места. Подпись обязательна: это `tablist`. */
function TabList({ children, ...rest }: TabListProps) {
  return (
    <HeroTabs.ListContainer>
      <HeroTabs.List {...rest}>{children}</HeroTabs.List>
    </HeroTabs.ListContainer>
  )
}

type TabProps = Omit<ComponentProps<typeof HeroTabs.Tab>, 'children'> & { children: ReactNode }

function Tab({ children, ...rest }: TabProps) {
  return (
    <HeroTabs.Tab {...rest}>
      {children}
      <HeroTabs.Indicator />
    </HeroTabs.Tab>
  )
}

function TabsRoot(props: ComponentProps<typeof HeroTabs>) {
  return <HeroTabs {...props} />
}

export const Tabs = Object.assign(TabsRoot, { List: TabList, Tab, Panel: HeroTabs.Panel })

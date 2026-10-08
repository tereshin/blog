import { Popover as HeroPopover } from '@heroui/react/popover'
import type { ComponentProps } from 'react'

type PopoverContentProps = ComponentProps<typeof HeroPopover.Content>

function PopoverContent({ children, ...rest }: PopoverContentProps) {
  return (
    <HeroPopover.Content {...rest}>
      <HeroPopover.Dialog>{children}</HeroPopover.Dialog>
    </HeroPopover.Content>
  )
}

function PopoverRoot(props: ComponentProps<typeof HeroPopover>) {
  return <HeroPopover {...props} />
}

export const Popover = Object.assign(PopoverRoot, { Trigger: HeroPopover.Trigger, Content: PopoverContent, Heading: HeroPopover.Heading })

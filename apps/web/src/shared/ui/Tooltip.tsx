import { Tooltip as HeroTooltip } from '@heroui/react/tooltip'
import type { ComponentProps } from 'react'

function TooltipRoot(props: ComponentProps<typeof HeroTooltip>) {
  return <HeroTooltip {...props} />
}

export const Tooltip = Object.assign(TooltipRoot, { Trigger: HeroTooltip.Trigger, Content: HeroTooltip.Content })

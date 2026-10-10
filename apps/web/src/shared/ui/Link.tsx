import { Link as HeroLink } from '@heroui/react/link'
import type { ComponentProps } from 'react'

export type LinkProps = ComponentProps<typeof HeroLink>

function LinkRoot(props: LinkProps) {
  return <HeroLink {...props} />
}

export const Link = Object.assign(LinkRoot, { Icon: HeroLink.Icon })

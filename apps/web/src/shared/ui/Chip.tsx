import { Chip as HeroChip } from '@heroui/react/chip'
import type { ComponentProps } from 'react'

export type ChipProps = ComponentProps<typeof HeroChip>

export function Chip(props: ChipProps) {
  return <HeroChip {...props} />
}

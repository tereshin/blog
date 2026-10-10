import { CloseButton as HeroCloseButton } from '@heroui/react/close-button'
import type { ComponentProps } from 'react'

export type CloseButtonProps = ComponentProps<typeof HeroCloseButton>

export function CloseButton(props: CloseButtonProps) {
  return <HeroCloseButton {...props} />
}

import { BLOCK_BUTTON_SIZES, BLOCK_BUTTON_VARIANTS } from '@blog/contracts'
import type { BlockButton, BlockButtonSize, BlockButtonVariant } from '@blog/contracts'

export type ButtonsData = { items: BlockButton[] }

export type DraftButton = {
  text: string
  url: string
  size: BlockButtonSize
  variant: BlockButtonVariant
  icon?: string
}

export type ButtonsConfig = {
  text_placeholder: string
  url_label: string
  url_placeholder: string
  size_label: string
  variant_label: string
  sizes: Record<BlockButtonSize, string>
  variants: Record<BlockButtonVariant, string>
  icon_add: string
  icon_remove: string
  icon_invalid: string
  add_label: string
  remove_label: string
}

export const FALLBACK: ButtonsConfig = {
  text_placeholder: 'Button text',
  url_label: 'Link',
  url_placeholder: 'https://',
  size_label: 'Size',
  variant_label: 'Variant',
  sizes: { sm: 'S', md: 'M', lg: 'L' },
  variants: {
    primary: 'Primary',
    secondary: 'Secondary',
    tertiary: 'Tertiary',
    outline: 'Outline',
    ghost: 'Ghost',
    danger: 'Danger',
    'danger-soft': 'Danger soft',
  },
  icon_add: 'SVG icon',
  icon_remove: 'Remove icon',
  icon_invalid: 'The file is not a safe SVG icon',
  add_label: 'Add button',
  remove_label: 'Remove button',
}

export const TOOLBOX_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="10" rx="5"/><path d="M8 12h8"/></svg>'

export function oneOf<T extends string>(values: readonly T[], value: unknown, fallback: T): T {
  return values.find((item) => item === value) ?? fallback
}

export function draftOf(value: unknown): DraftButton {
  const item: Partial<Record<keyof DraftButton, unknown>> = value && typeof value === 'object' ? value : {}
  return {
    text: typeof item.text === 'string' ? item.text : '',
    url: typeof item.url === 'string' ? item.url : '',
    size: oneOf(BLOCK_BUTTON_SIZES, item.size, 'md'),
    variant: oneOf(BLOCK_BUTTON_VARIANTS, item.variant, 'primary'),
    ...(typeof item.icon === 'string' && item.icon ? { icon: item.icon } : {}),
  }
}

export function emptyDraft(): DraftButton {
  return { text: '', url: '', size: 'md', variant: 'primary' }
}

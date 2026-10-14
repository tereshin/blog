import type { Translate } from '@/shared/i18n'
import type { ButtonsConfig } from './buttons-tool.ts'

export function buttonsToolConfig(t: Translate): ButtonsConfig {
  return {
    text_placeholder: t('editor.buttons.text'),
    url_label: t('editor.buttons.url'),
    url_placeholder: 'https://example.com',
    size_label: t('editor.buttons.size'),
    variant_label: t('editor.buttons.variant'),
    sizes: {
      sm: t('editor.buttons.size.sm'),
      md: t('editor.buttons.size.md'),
      lg: t('editor.buttons.size.lg'),
    },
    variants: {
      primary: t('editor.buttons.variant.primary'),
      secondary: t('editor.buttons.variant.secondary'),
      tertiary: t('editor.buttons.variant.tertiary'),
      outline: t('editor.buttons.variant.outline'),
      ghost: t('editor.buttons.variant.ghost'),
      danger: t('editor.buttons.variant.danger'),
      'danger-soft': t('editor.buttons.variant.danger_soft'),
    },
    icon_add: t('editor.buttons.icon'),
    icon_remove: t('editor.buttons.icon_remove'),
    icon_invalid: t('editor.buttons.icon_invalid'),
    add_label: t('editor.buttons.add'),
    remove_label: t('editor.buttons.remove'),
  }
}

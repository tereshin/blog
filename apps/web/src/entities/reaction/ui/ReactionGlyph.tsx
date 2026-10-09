import type { ReactionAppearance } from '@blog/contracts'
import { FallbackImage } from '@/shared/ui'

type ReactionGlyphProps = {
  appearance: ReactionAppearance
  label: string
  /** Рядом уже есть текстовое имя: сломанная картинка его не повторяет. */
  hide_label_on_error?: boolean
}

/** Глиф вида реакции: эмодзи или картинка. Имя для читалки остаётся на кнопке. */
export function ReactionGlyph({ appearance, label, hide_label_on_error = false }: ReactionGlyphProps) {
  if (appearance.presentation === 'emoji') {
    return <span aria-hidden="true">{appearance.emoji}</span>
  }
  return (
    <FallbackImage
      src={appearance.image_url}
      label={label}
      hide_label={hide_label_on_error}
      className="inline-block h-4 w-4 object-contain align-text-bottom"
    />
  )
}

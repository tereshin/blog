import type { ReactionAppearance } from '@blog/contracts'
import { FallbackImage } from '@/shared/ui'

type ReactionGlyphProps = {
  appearance: ReactionAppearance
  label: string
  size?: 'sm' | 'lg'
  /** Рядом уже есть текстовое имя: сломанная картинка его не повторяет. */
  hide_label_on_error?: boolean
}

/** Глиф вида реакции: эмодзи или картинка. Имя для читалки остаётся на кнопке. */
export function ReactionGlyph({
  appearance,
  label,
  size = 'sm',
  hide_label_on_error = false,
}: ReactionGlyphProps) {
  if (appearance.presentation === 'emoji') {
    return (
      <span aria-hidden="true" className={size === 'lg' ? 'text-[32px] leading-none' : undefined}>
        {appearance.emoji}
      </span>
    )
  }
  return (
    <FallbackImage
      src={appearance.image_url}
      label={label}
      hide_label={hide_label_on_error}
      className={`inline-block shrink-0 object-contain align-text-bottom ${size === 'lg' ? 'size-8' : 'size-4'}`}
    />
  )
}

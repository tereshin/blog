import { cva } from 'class-variance-authority'
import type { ReactionAppearance } from '@blog/contracts'
import { FallbackImage } from '@/shared/ui'

type ReactionGlyphProps = {
  appearance: ReactionAppearance
  label: string
  size?: 'sm' | 'lg'
}

const emoji_class = cva(undefined, {
  variants: {
    size: {
      sm: undefined,
      lg: 'text-[32px] leading-none',
    },
  },
  defaultVariants: { size: 'sm' },
})

const image_class = cva('inline-block shrink-0 object-contain align-text-bottom', {
  variants: {
    size: {
      sm: 'size-4',
      lg: 'size-8',
    },
  },
  defaultVariants: { size: 'sm' },
})

/** Глиф вида реакции: эмодзи или картинка. Имя для читалки остаётся на кнопке. */
export function ReactionGlyph({ appearance, label, size = 'sm' }: ReactionGlyphProps) {
  if (appearance.presentation === 'emoji') {
    return (
      <span aria-hidden="true" className={emoji_class({ size })}>
        {appearance.emoji}
      </span>
    )
  }
  return (
    <FallbackImage
      src={appearance.image_url}
      label={label}
      fallback={null}
      className={image_class({ size })}
    />
  )
}

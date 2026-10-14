import { BLOCK_BUTTON_SIZES, BLOCK_BUTTON_VARIANTS } from '@blog/contracts'
import type { BlockButtonSize, BlockButtonVariant } from '@blog/contracts'
import { buttonVariants } from '@heroui/react/button'
import { SvgIcon } from '../SvgIcon.tsx'
import { httpsUrl, textOf } from './block-data.ts'

const BUTTON_ICON_SIZES: Record<BlockButtonSize, string> = {
  sm: 'size-4',
  md: 'size-4',
  lg: 'size-5',
}

function oneOf<T extends string>(values: readonly T[], value: unknown, fallback: T): T {
  return values.find((item) => item === value) ?? fallback
}

type ButtonsViewProps = { items: unknown[] }

export function ButtonsView({ items }: ButtonsViewProps) {
  const buttons = items.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const data = item as Record<string, unknown>
    const href = httpsUrl(data.url)
    const text = textOf(data, 'text').trim()
    if (!href || !text) return []
    const size = oneOf<BlockButtonSize>(BLOCK_BUTTON_SIZES, data.size, 'md')
    const variant = oneOf<BlockButtonVariant>(BLOCK_BUTTON_VARIANTS, data.variant, 'primary')
    return [{ href, text, size, variant, icon: textOf(data, 'icon') }]
  })
  if (buttons.length === 0) return null
  return (
    <div className="my-4 flex flex-wrap items-center gap-3">
      {buttons.map((button) => (
        <a
          key={`${button.href}:${button.text}`}
          href={button.href}
          rel="noopener noreferrer"
          target="_blank"
          className={buttonVariants({ size: button.size, variant: button.variant })}
        >
          {button.icon ? (
            <SvgIcon svg={button.icon} className={BUTTON_ICON_SIZES[button.size]} />
          ) : null}
          {button.text}
        </a>
      ))}
    </div>
  )
}

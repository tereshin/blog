import { useState } from 'react'
import { cn, formatCount } from '@/shared/lib'
import type { CountLocale } from '@/shared/lib'
import './animated-count.css'

type AnimatedCountProps = {
  value: number
  locale?: CountLocale
  className?: string
}

/** Rolls only changed places; the accessible value is always the current count. */
export function AnimatedCount({ value, locale = 'ru', className }: AnimatedCountProps) {
  const count = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
  const formatted = formatCount(count, locale)
  const [frame, setFrame] = useState({ value: count, formatted, previous: formatted, direction: 'up' })
  if (frame.value !== count || frame.formatted !== formatted) {
    setFrame({ value: count, formatted, previous: frame.formatted, direction: count >= frame.value ? 'up' : 'down' })
  }
  const characters = Array.from(formatted)
  const previous = Array.from(frame.previous)
  return (
    <span className={cn('animated-count', className)} data-direction={frame.direction}>
      <span className="sr-only">{formatted}</span>
      <span aria-hidden="true" className="animated-count__digits">
        {characters.map((character, offset) => {
          const place = characters.length - offset - 1
          const old_character = previous[previous.length - place - 1]
          const has_changed = old_character !== character
          return (
            <span className="animated-count__place" key={place}>
              {has_changed && old_character ? (
                <span key={`old-${old_character}`} className="animated-count__out" data-digit={old_character} />
              ) : null}
              <span key={character} className={has_changed ? 'animated-count__in' : undefined} data-digit={character} />
            </span>
          )
        })}
      </span>
    </span>
  )
}

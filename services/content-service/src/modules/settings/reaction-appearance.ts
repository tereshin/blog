import { DEFAULT_REACTION_APPEARANCES } from '@blog/contracts'
import { ValidationError } from '@blog/errors'

export { DEFAULT_REACTION_APPEARANCES }

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/**
 * Одна графема-эмодзи. Пустая строка, обычное слово и несколько графем не проходят.
 * Склейка ZWJ, которую сегментатор считает одной графемой, остаётся как есть.
 */
export function assertSingleEmoji(emoji: string, field = 'emoji'): string {
  const segments = [...GRAPHEMES.segment(emoji)]
  const grapheme = segments.length === 1 ? (segments[0]?.segment ?? '') : ''
  if (grapheme.length === 0 || !/\p{Extended_Pictographic}/u.test(grapheme)) {
    throw new ValidationError({
      message: 'Эмодзи реакции должно быть одной графемой',
      details: { field },
    })
  }
  return grapheme
}

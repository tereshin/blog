import { describe, expect, it } from 'vitest'
import { ValidationError } from '@blog/errors'
import { DEFAULT_REACTION_APPEARANCES, assertSingleEmoji } from '../../src/modules/settings/reaction-appearance.ts'

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const zwj_family = '👨‍👩‍👧‍👦'

describe('вид реакции', () => {
  it('пока суперадминистратор не сохранял, значения 😄 ❤️ 👍 🔥', () => {
    expect(DEFAULT_REACTION_APPEARANCES).toEqual([
      { kind: 'laugh', presentation: 'emoji', emoji: '😄' },
      { kind: 'heart', presentation: 'emoji', emoji: '❤️' },
      { kind: 'thumb', presentation: 'emoji', emoji: '👍' },
      { kind: 'fire', presentation: 'emoji', emoji: '🔥' },
    ])
    for (const appearance of DEFAULT_REACTION_APPEARANCES) {
      if (appearance.presentation === 'emoji') expect(assertSingleEmoji(appearance.emoji)).toBe(appearance.emoji)
    }
  })

  it('пустой эмодзи, две графемы и обычное слово не сохраняются', () => {
    expect(() => assertSingleEmoji('')).toThrow(ValidationError)
    expect(() => assertSingleEmoji('😄😄')).toThrow(ValidationError)
    expect(() => assertSingleEmoji('hello')).toThrow(ValidationError)
    expect(() => assertSingleEmoji('я')).toThrow(ValidationError)
  })

  it('одна графема-эмодзи сохраняется, склейка ZWJ тоже', () => {
    expect([...segmenter.segment(zwj_family)]).toHaveLength(1)
    expect(assertSingleEmoji('😄')).toBe('😄')
    expect(assertSingleEmoji('❤️')).toBe('❤️')
    expect(assertSingleEmoji(zwj_family)).toBe(zwj_family)
  })
})

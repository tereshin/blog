import { describe, expect, it } from 'vitest'
import { pairOf } from '../../src/modules/conversation/index.ts'
import { toExcerpt } from '../../src/shared/excerpt.ts'

describe('пара диалога и фрагмент', () => {
  it('меньший идентификатор всегда слева, повтор не меняет пару', () => {
    const low = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
    const high = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'
    expect(pairOf(high, low)).toEqual({ user_low_id: low, user_high_id: high })
    expect(pairOf(low, high)).toEqual(pairOf(high, low))
  })

  it('фрагмент не длиннее 140 символов', () => {
    const excerpt = toExcerpt(`${'слово '.repeat(40)}конец`)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt.length).toBeLessThanOrEqual(140)
  })
})

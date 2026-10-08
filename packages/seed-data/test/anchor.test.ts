import { describe, expect, it } from 'vitest'
import { ANCHOR_OFFSETS, AnchorConflictError, at, resolveAnchor } from '../src/index.ts'

const now = new Date('2026-10-08T21:45:12Z')

describe('resolveAnchor', () => {
  it('без записанного и флага — начало суток UTC', () => {
    expect(resolveAnchor({ now }).toISOString()).toBe('2026-10-08T00:00:00.000Z')
  })

  it('флаг задаёт якорь явно', () => {
    expect(resolveAnchor({ flag: '2026-01-01T00:00:00Z', now }).toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('записанный якорь важнее now', () => {
    const recorded = new Date('2026-05-05T00:00:00Z')
    expect(resolveAnchor({ recorded, now })).toEqual(recorded)
  })

  it('совпадающий флаг допустим, другой — отказ', () => {
    const recorded = new Date('2026-05-05T00:00:00Z')
    expect(resolveAnchor({ recorded, flag: '2026-05-05T00:00:00Z', now })).toEqual(recorded)
    expect(() => resolveAnchor({ recorded, flag: '2026-06-06T00:00:00Z', now })).toThrow(AnchorConflictError)
  })

  it('некорректный флаг — ошибка', () => {
    expect(() => resolveAnchor({ flag: 'вчера', now })).toThrow(/anchor/)
  })
})

describe('at и смещения', () => {
  const anchor = new Date('2026-01-01T00:00:00Z')

  it('действующее продвижение заканчивается после якоря, истёкшее — до', () => {
    expect(at(anchor, ANCHOR_OFFSETS.promotion_active_until).getTime()).toBeGreaterThan(anchor.getTime())
    expect(at(anchor, ANCHOR_OFFSETS.promotion_expired_until).getTime()).toBeLessThan(anchor.getTime())
  })

  it('«Год на площадке» — за 400 суток до якоря', () => {
    const created = at(anchor, ANCHOR_OFFSETS.member_one_year_created_at)
    expect(Math.round((anchor.getTime() - created.getTime()) / 86_400_000)).toBe(400)
  })
})

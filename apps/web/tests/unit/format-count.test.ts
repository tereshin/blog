import { describe, expect, it } from 'vitest'
import { formatCount } from '@/shared/lib'

describe('formatCount', () => {
  it.each([
    [0, '0'],
    [7, '7'],
    [999, '999'],
    [1000, '1К'],
    [1500, '1,5К'],
    [1999, '1,9К'],
    [12_345, '12,3К'],
    [999_999, '999,9К'],
    [1_000_000, '1М'],
    [2_500_000, '2,5М'],
  ])('ru: %i → %s', (count, expected) => {
    expect(formatCount(count, 'ru').replace(/\u00a0/g, ' ')).toBe(expected)
  })

  it('en и sr используют латинские K и M', () => {
    expect(formatCount(1500, 'en')).toBe('1.5K')
    expect(formatCount(1500, 'sr')).toBe('1,5K')
    expect(formatCount(1_000_000, 'en')).toBe('1M')
  })

  it('отрицательные и нечисловые значения сводятся к нулю', () => {
    expect(formatCount(-5)).toBe('0')
    expect(formatCount(Number.NaN)).toBe('0')
  })
})

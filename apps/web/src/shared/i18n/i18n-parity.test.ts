import { describe, expect, it } from 'vitest'
import en from '@/shared/i18n/en.json'
import ru from '@/shared/i18n/ru.json'
import sr from '@/shared/i18n/sr.json'
import { formatCount } from '@/shared/lib'

function keysOf(catalog: object): string[] {
  return Object.keys(catalog).sort()
}

describe('каталоги интерфейса', () => {
  it('русский, английский и сербский содержат один и тот же набор ключей', () => {
    expect(keysOf(en)).toEqual(keysOf(ru))
    expect(keysOf(sr)).toEqual(keysOf(ru))
  })

  it('английский и сербский считают тысячи и миллионы латинскими K и M', () => {
    expect(formatCount(1000, 'en')).toMatch(/K$/)
    expect(formatCount(1000, 'sr')).toMatch(/K$/)
    expect(formatCount(1_000_000, 'en')).toBe('1M')
    expect(formatCount(1_000_000, 'sr')).toMatch(/M$/)
  })
})

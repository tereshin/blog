import { describe, expect, it } from 'vitest'
import { formatTime } from '@/shared/lib'

describe('formatTime', () => {
  const now = new Date(2026, 9, 8, 15, 30)

  it('сегодняшнее — часы и минуты с ведущими нулями', () => {
    expect(formatTime(new Date(2026, 9, 8, 9, 5), now)).toBe('09:05')
    expect(formatTime(new Date(2026, 9, 8, 0, 0), now)).toBe('00:00')
  })

  it('вчерашнее и более старое — дата день.месяц.год', () => {
    expect(formatTime(new Date(2026, 9, 7, 23, 59), now)).toBe('07.10.2026')
    expect(formatTime(new Date(2025, 0, 2, 12, 0), now)).toBe('02.01.2025')
  })

  it('принимает строку ISO', () => {
    expect(formatTime(new Date(2026, 9, 8, 10, 0).toISOString(), now)).toBe('10:00')
  })

  it('некорректная дата — пустая строка', () => {
    expect(formatTime('не дата', now)).toBe('')
  })
})

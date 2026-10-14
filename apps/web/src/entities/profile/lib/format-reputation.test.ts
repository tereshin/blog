import { describe, expect, it } from 'vitest'
import { formatReputation } from '@/entities/profile'

describe('formatReputation', () => {
  it('ноль без плюса, положительное с плюсом, отрицательное не уходит ниже нуля', () => {
    expect(formatReputation(0)).toBe('0')
    expect(formatReputation(12)).toBe('+12')
    expect(formatReputation(-4)).toBe('0')
    expect(formatReputation(3.9)).toBe('+3')
  })
})

import { describe, expect, it } from 'vitest'
import { int, mulberry32, pick, shuffle } from '../src/index.ts'

describe('mulberry32', () => {
  it('одно зерно — одна и та же последовательность', () => {
    const first = mulberry32(42)
    const second = mulberry32(42)
    const a = Array.from({ length: 5 }, () => first())
    const b = Array.from({ length: 5 }, () => second())
    expect(a).toEqual(b)
  })

  it('разные зёрна расходятся, значения в [0, 1)', () => {
    const values = Array.from({ length: 100 }, mulberry32(7))
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
    expect(values).not.toEqual(Array.from({ length: 100 }, mulberry32(8)))
  })
})

describe('int, pick, shuffle', () => {
  it('int держится в границах включительно', () => {
    const random = mulberry32(1)
    const values = Array.from({ length: 500 }, () => int(random, 3, 5))
    expect(Math.min(...values)).toBe(3)
    expect(Math.max(...values)).toBe(5)
  })

  it('pick и shuffle детерминированы и не мутируют вход', () => {
    const items = ['a', 'b', 'c', 'd', 'e'] as const
    expect(pick(mulberry32(9), items)).toBe(pick(mulberry32(9), items))
    expect(shuffle(mulberry32(9), items)).toEqual(shuffle(mulberry32(9), items))
    expect([...shuffle(mulberry32(9), items)].sort()).toEqual([...items])
  })
})

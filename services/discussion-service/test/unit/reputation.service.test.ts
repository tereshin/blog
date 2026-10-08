import { describe, expect, it } from 'vitest'
import { reputationOf } from '../../src/modules/reputation/index.ts'

describe('репутация', () => {
  const facts = [
    { target_type: 'article' as const, status: 'published' },
    { target_type: 'article' as const, status: 'published' },
    { target_type: 'article' as const, status: 'draft' },
    { target_type: 'article' as const, status: 'hidden' },
    { target_type: 'comment' as const, status: 'visible' },
    { target_type: 'comment' as const, status: 'hidden' },
    { target_type: 'comment' as const, status: 'deleted' },
  ]

  it('считает реакции только на опубликованные статьи и видимые комментарии', () => {
    expect(reputationOf(facts)).toBe(3)
  })

  it('пустое множество — ноль', () => {
    expect(reputationOf([])).toBe(0)
  })
})

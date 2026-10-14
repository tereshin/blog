import { describe, expect, it } from 'vitest'
import { ReputationService } from '../../src/modules/reputation/index.ts'

const service = new ReputationService<null>({ listFacts: async () => [] })

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
    expect(service.reputationOf(facts)).toBe(3)
  })

  it('пустое множество — ноль', () => {
    expect(service.reputationOf([])).toBe(0)
  })
})

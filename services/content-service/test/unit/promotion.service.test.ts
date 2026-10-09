import { describe, expect, it } from 'vitest'
import type { ServiceContext } from '@blog/contracts'
import { ForbiddenError } from '@blog/errors'
import { PromotionNotAllowedError } from '../../src/modules/promotion/promotion.errors.ts'
import { createPromotionService } from '../../src/modules/promotion/promotion.service.ts'
import type { PromotionArticle, PromotionRepository, PromotionRow } from '../../src/modules/promotion/promotion.types.ts'

const DAY = 24 * 60 * 60 * 1000
const ARTICLE = '00000000-0000-4000-8000-000000000106'
const AUTHOR = '3f1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a22'
const OTHER = '9a1d3c9e-1b0a-4a55-8f2b-6f6d5d3f7a99'

const author: ServiceContext = { user_id: AUTHOR, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${AUTHOR}` }
const other: ServiceContext = { user_id: OTHER, role: 'member', is_restricted: false, can_publish: true, viewer_key: `user:${OTHER}` }

function published(): PromotionArticle {
  return { id: ARTICLE, author_id: AUTHOR, status: 'published' }
}

function repository(article: PromotionArticle | null): PromotionRepository & { saved: PromotionRow | null } {
  const state: { saved: PromotionRow | null } = { saved: null }
  return {
    get saved() {
      return state.saved
    },
    findArticle: async () => article,
    find: async () => state.saved,
    upsert: async (row) => {
      state.saved = row
      return row
    },
  }
}

describe('продвижение: повтор заменяет срок', () => {
  it('новые 7 суток считаются от нового подтверждения, остаток не прибавляется', async () => {
    const times = [new Date('2026-01-01T00:00:00.000Z'), new Date('2026-01-03T00:00:00.000Z')]
    let index = 0
    const service = createPromotionService(repository(published()), { now: () => times[index++] as Date })

    const first = await service.confirm(author, ARTICLE)
    const second = await service.confirm(author, ARTICLE)

    expect(Date.parse(first.until) - Date.parse(first.confirmed_at)).toBe(7 * DAY)
    expect(first.confirmed_at).toBe('2026-01-01T00:00:00.000Z')
    expect(second.confirmed_at).toBe('2026-01-03T00:00:00.000Z')
    expect(Date.parse(second.until) - Date.parse(second.confirmed_at)).toBe(7 * DAY)
    expect(second.until).toBe('2026-01-10T00:00:00.000Z')
  })

  it('чужой и неопубликованной статье подтверждение недоступно', async () => {
    const published_service = createPromotionService(repository(published()))
    await expect(published_service.confirm(other, ARTICLE)).rejects.toBeInstanceOf(ForbiddenError)

    const draft = createPromotionService(repository({ id: ARTICLE, author_id: AUTHOR, status: 'draft' }))
    await expect(draft.confirm(author, ARTICLE)).rejects.toBeInstanceOf(PromotionNotAllowedError)
  })
})

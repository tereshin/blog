import { afterEach, describe, expect, it, vi } from 'vitest'
import { toArticleCard } from '@/entities/article'
import { getProfileArticles } from '@/entities/profile'
import { http } from '@/shared/api'
import { buildFeedFixture } from '@/shared/api/mocks/fixtures/feed.ts'

vi.mock('@/shared/api', () => ({ http: { get: vi.fn() } }))
afterEach(() => vi.restoreAllMocks())

describe('карточки статей профиля', () => {
  it('сохраняет аватар темы и признак скрытого содержимого при проверке DTO', async () => {
    const dto = buildFeedFixture(1)[0]
    if (!dto) throw new Error('Missing article fixture')
    const response = {
      items: [{
        ...dto,
        has_more_content: false,
        topic: { ...dto.topic, avatar_url: 'https://example.com/topic.png' },
      }],
      next_cursor: null,
    }
    vi.mocked(http.get).mockImplementation(async (_path, schema) => schema.parse(response))
    const page = await getProfileArticles('anna', 'fresh', null)
    const parsed = page.items[0]
    if (!parsed || !parsed.published_at) throw new Error('Missing published article')
    const card = toArticleCard({ ...parsed, published_at: parsed.published_at })
    expect(card.topic.avatar_url).toBe('https://example.com/topic.png')
    expect(card.has_more_content).toBe(false)
  })
})

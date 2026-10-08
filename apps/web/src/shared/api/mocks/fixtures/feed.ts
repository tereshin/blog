/** Фикстура ленты для режима мока, историй и Playwright: 45 статей, самые свежие — сегодняшние. */
const TOPICS = [
  { id: '5f0f6a52-0d8b-4f6e-a8b1-000000000001', slug: 'tehnologii', title: 'Технологии' },
  { id: '5f0f6a52-0d8b-4f6e-a8b1-000000000002', slug: 'dizajn', title: 'Дизайн' },
  { id: '5f0f6a52-0d8b-4f6e-a8b1-000000000003', slug: 'nauka', title: 'Наука' },
  { id: '5f0f6a52-0d8b-4f6e-a8b1-000000000004', slug: 'kultura', title: 'Культура' },
] as const

const AUTHORS = [
  { user_id: 'a1000000-0000-4000-8000-000000000001', display_name: 'Анна Авторова', slug: 'anna' },
  { user_id: 'a1000000-0000-4000-8000-000000000002', display_name: 'Борис Писарев', slug: 'boris' },
  { user_id: 'a1000000-0000-4000-8000-000000000003', display_name: 'Вера Мельникова', slug: 'vera' },
] as const

export type FeedCardFixture = {
  id: string
  slug: string
  title: string
  excerpt: string
  first_image_url: string | null
  published_at: string
  author: { user_id: string; display_name: string; avatar_url: string | null; slug: string }
  topic: { id: string; title: string; slug: string; status: 'active' | 'archived' }
  reaction_counts: { laugh: number; heart: number; thumb: number; fire: number }
  reaction_count: number
  comment_count: number
  bookmark_count: number
  view_count: number
  top_comment: { id: string; author_name: string; author_avatar_url: string | null; excerpt: string } | null
  visibility: 'public' | 'members' | 'author'
  comments_enabled: boolean
}

const IMAGE =
  'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22720%22 height=%22405%22%3E%3Crect width=%22720%22 height=%22405%22 fill=%22%23445%22/%3E%3C/svg%3E'

function pad(value: number, size = 12): string {
  return String(value).padStart(size, '0')
}

export function buildFeedFixture(count = 45, now: Date = new Date()): FeedCardFixture[] {
  return Array.from({ length: count }, (_, index) => {
    const topic = TOPICS[index % TOPICS.length] ?? TOPICS[0]
    const author = AUTHORS[index % AUTHORS.length] ?? AUTHORS[0]
    const reactions = (index * 3) % 17
    const comments = (index * 5) % 11
    return {
      id: `9b2e3f40-2222-4b22-8b22-${pad(index + 1)}`,
      slug: `statya-${index + 1}`,
      title: `Статья ${index + 1}: ${topic.title.toLowerCase()} без компромиссов`,
      excerpt: 'Короткий фрагмент статьи, чтобы карточка выглядела как настоящая. Здесь несколько предложений текста.',
      first_image_url: index % 2 === 0 ? IMAGE : null,
      // Каждая следующая статья старше предыдущей на 97 минут: первые попадают на сегодня, остальные — на прошлые дни.
      published_at: new Date(now.getTime() - (index + 1) * 97 * 60_000).toISOString(),
      author: { ...author, avatar_url: null },
      topic: { ...topic, status: 'active' as const },
      reaction_counts: { laugh: Math.floor(reactions / 4), heart: Math.ceil(reactions / 2), thumb: 0, fire: reactions % 3 },
      reaction_count: reactions,
      comment_count: comments,
      bookmark_count: (index * 7) % 23,
      view_count: 120 + index * 311,
      top_comment:
        comments > 0
          ? { id: `7a1c2d30-1111-4a11-8a11-${pad(index + 1)}`, author_name: 'Борис Писарев', author_avatar_url: null, excerpt: 'Хороший разбор, спасибо.' }
          : null,
      visibility: 'public' as const,
      comments_enabled: true,
    }
  })
}

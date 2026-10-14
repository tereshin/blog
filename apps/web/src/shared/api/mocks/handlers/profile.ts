import { PROFILE_BADGES } from '@blog/contracts'
import { readSite } from './shell.ts'
import { readMockArticles } from './articles-store.ts'
import { delay, HttpResponse, http } from 'msw'
import { readMockViewer } from './session.ts'
import { mockCommentBookmarked, mockViewerId, readStoredComments } from './discussion-store.ts'
import { mockFeedArticles } from './feed.ts'

type ProfileBody = Partial<{
  display_name: string
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  slug: string | null
  status_icon_id: string | null
}>

const READER = '0b3a4c50-3333-4c33-8c33-000000000005'
const ANNA = '0b3a4c50-3333-4c33-8c33-000000000001'

const profile = {
  user_id: READER,
  public_number: 5,
  display_name: 'Роман Читаев',
  bio: null as string | null,
  avatar_url: null as string | null,
  cover_url: null as string | null,
  status_icon_id: null as string | null,
  slug: 'reader' as string | null,
  reputation: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  followers_count: 2,
  following_count: 1,
  badges: [] as string[],
  is_own: true,
  is_following: false,
}

const anna = {
  user_id: ANNA,
  public_number: 1,
  display_name: 'Анна Авторова',
  bio: 'Пишет о технологиях',
  avatar_url: null,
  cover_url: null,
  slug: 'anna',
  status_icon_id: null as string | null,
  reputation: 12,
  created_at: '2020-01-01T00:00:00.000Z',
  followers_count: 3,
  following_count: 0,
  badges: ['first_post', 'ten_reactions', 'one_year'],
  is_own: false,
  is_following: false,
}

const article = {
  id: '9b2e3f40-2222-4b22-8b22-000000000001',
  slug: 'statya-1',
  title: 'Как устроена лента',
  excerpt: 'Короткий фрагмент статьи.',
  first_image_url: null,
  published_at: '2026-10-01T10:00:00.000Z',
  author: { user_id: READER, display_name: 'Роман Читаев', avatar_url: null, slug: 'reader', status_icon_id: null },
  topic: { id: '5f0f6a52-0d8b-4f6e-a8b1-000000000001', title: 'Технологии', slug: 'tehnologii', status: 'active' },
  reaction_counts: { laugh: 0, heart: 0, thumb: 0, fire: 0 },
  reaction_count: 0,
  comment_count: 1,
  bookmark_count: 0,
  view_count: 4,
  top_comment: null,
  visibility: 'public',
  comments_enabled: true,
  status: 'published',
}

const comment = {
  id: '00000000-0000-4000-8000-000000000020',
  excerpt: 'Главное — стабильный порядок.',
  article_id: article.id,
  article_title: article.title,
  article_slug: article.slug,
  created_at: '2026-10-02T10:00:00.000Z',
  reaction_count: 2,
  reaction_counts: { laugh: 0, heart: 0, thumb: 0, fire: 2 },
  my_reaction: null,
  is_bookmarked: false,
}

const awards_by_profile = new Map<number, Set<string>>()

function profileOf(slug: string) {
  const viewer = readMockViewer()
  const found = slug === anna.slug || slug === String(anna.public_number)
    ? { ...anna, ...(viewer === 'author' ? { user_id: 'a1000000-0000-4000-8000-000000000001' } : {}), is_own: viewer === 'author' }
    : slug === profile.slug || slug === String(profile.public_number) ? { ...profile, is_own: viewer === 'member' } : null
  if (!found) return null
  const stored = awards_by_profile.get(found.public_number) ?? []
  const earned = new Set([...found.badges, ...stored])
  const published_posts = 1 + readMockArticles().filter((item) => item.author_id === found.user_id && item.status === 'published').length
  const now = new Date()
  for (const badge of readSite().settings.profile_badges) {
    if (badge.status !== 'active') continue
    const { metric, threshold } = badge.trigger
    const anniversary = new Date(found.created_at)
    const day = anniversary.getUTCDate()
    anniversary.setUTCDate(1)
    anniversary.setUTCMonth(anniversary.getUTCMonth() + threshold)
    anniversary.setUTCDate(Math.min(day, new Date(Date.UTC(anniversary.getUTCFullYear(), anniversary.getUTCMonth() + 1, 0)).getUTCDate()))
    if ((metric === 'published_posts' && published_posts >= threshold)
      || (metric === 'reputation' && found.reputation >= threshold)
      || (metric === 'membership_months' && anniversary <= now)) earned.add(badge.id)
  }
  awards_by_profile.set(found.public_number, earned)
  return { ...found, badge_ids: [...earned], badges: PROFILE_BADGES.filter((id) => earned.has(id)) }
}

export const profileHandlers = [
  http.get('*/v1/profiles/me/stats', () => HttpResponse.json({ view_count: 4, reaction_count: 1, followers_count: 2 })),
  http.get('*/v1/rating', ({ request }) => {
    const url = new URL(request.url)
    const limit = Number(url.searchParams.get('limit') ?? 20)
    const entries = [
      { user_id: ANNA, display_name: anna.display_name, avatar_url: null, slug: 'anna', reputation: 12 },
      { user_id: '0b3a4c50-3333-4c33-8c33-000000000002', display_name: 'Алексей Бегин', avatar_url: null, slug: 'alex', reputation: 8 },
      { user_id: '0b3a4c50-3333-4c33-8c33-000000000003', display_name: 'Вадим Будков', avatar_url: null, slug: 'vadim', reputation: 8 },
      { user_id: '0b3a4c50-3333-4c33-8c33-000000000004', display_name: 'Про аналитику', avatar_url: null, slug: 'analytics', reputation: 4 },
      { user_id: READER, display_name: profile.display_name, avatar_url: null, slug: 'reader', reputation: 0 },
      { user_id: '0b3a4c50-3333-4c33-8c33-000000000006', display_name: 'Новый блог', avatar_url: null, slug: '6', reputation: 0 },
    ]
    const start = Number(url.searchParams.get('cursor') ?? 0)
    return HttpResponse.json({ items: entries.slice(start, start + limit), next_cursor: start + limit < entries.length ? String(start + limit) : null })
  }),
  http.get('*/v1/profiles/:slug/articles', ({ params }) => {
    const found = profileOf(String(params.slug))
    if (!found) return HttpResponse.json({ code: 'not_found', title: 'Профиль не найден', status: 404 }, { status: 404 })
    const author = {
      user_id: found.user_id,
      display_name: found.display_name,
      avatar_url: found.avatar_url,
      slug: found.slug ?? String(found.public_number),
      status_icon_id: found.status_icon_id,
    }
    return HttpResponse.json({ items: [{ ...article, author }], next_cursor: null })
  }),
  http.get('*/v1/profiles/:slug/followers', () =>
    HttpResponse.json({
      items: [{ user_id: ANNA, display_name: anna.display_name, avatar_url: null, slug: 'anna', reputation: 12 }],
      next_cursor: null,
    }),
  ),
  http.get('*/v1/profiles/:slug/following', () => HttpResponse.json({ items: [], next_cursor: null })),
  http.get('*/v1/users/:user_id/comments', ({ params, request }) => {
    const url = new URL(request.url)
    const cursor = url.searchParams.get('cursor')
    if (cursor && window.localStorage.getItem('mock_profile_comments_fail_next') === '1') {
      return HttpResponse.json({ code: 'unavailable', title: 'Сервис недоступен' }, { status: 503 })
    }
    const viewer_id = mockViewerId()
    const stored = readStoredComments().filter((item) => item.author.user_id === params.user_id && item.status === 'visible')
    const items = stored.flatMap((item) => {
      const article = mockFeedArticles.find((article) => article.id === item.article_id)
      return article ? [{
        id: item.id,
        excerpt: item.body,
        article_id: article.id,
        article_title: article.title,
        article_slug: article.slug,
        created_at: item.created_at,
        reaction_counts: item.reaction_counts,
        reaction_count: Object.values(item.reaction_counts).reduce((sum, count) => sum + count, 0),
        my_reaction: viewer_id ? item.reactions[viewer_id] ?? null : null,
        is_bookmarked: mockCommentBookmarked(item.id, viewer_id),
      }] : []
    })
    if (!stored.length) return HttpResponse.json({ items: [comment], next_cursor: null })
    items.sort((a, b) => url.searchParams.get('sort') === 'popular'
      ? b.reaction_count - a.reaction_count || b.id.localeCompare(a.id)
      : b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
    const start = cursor ? items.findIndex((item) => item.id === cursor) + 1 : 0
    const page = items.slice(start, start + 20)
    return HttpResponse.json({ items: page, next_cursor: items.length > start + 20 ? page.at(-1)?.id : null })
  }),
  http.get('*/v1/profiles/:slug', async ({ params }) => {
    if (window.localStorage.getItem('mock_profile_delay') === '1') await delay(2000)
    const found = profileOf(String(params.slug))
    if (!found) return HttpResponse.json({ code: 'not_found', title: 'Профиль не найден', status: 404 }, { status: 404 })
    return HttpResponse.json(found)
  }),
  http.put('*/v1/profiles/me', async ({ request }) => {
    const body = (await request.json()) as ProfileBody
    if (body.slug === 'taken') {
      return HttpResponse.json({ code: 'slug_taken', title: 'Этот адрес уже занят', status: 409 }, { status: 409 })
    }
    Object.assign(profile, body)
    return HttpResponse.json(profile)
  }),
  http.post('*/v1/media', () =>
    HttpResponse.json({
      id: '11111111-1111-4111-8111-111111111111',
      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      kind: 'image',
      mime: 'image/png',
      byte_size: 70,
    }),
  ),
]

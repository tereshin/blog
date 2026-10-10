import { delay, HttpResponse, http } from 'msw'
import { readMockViewer } from './session.ts'

type ProfileBody = {
  display_name: string
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  slug: string | null
}

const READER = '0b3a4c50-3333-4c33-8c33-000000000005'
const ANNA = '0b3a4c50-3333-4c33-8c33-000000000001'

const profile = {
  user_id: READER,
  public_number: 5,
  display_name: 'Роман Читаев',
  bio: null as string | null,
  avatar_url: null as string | null,
  cover_url: null as string | null,
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
  author: { user_id: READER, display_name: 'Роман Читаев', avatar_url: null, slug: 'reader' },
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
}

function profileOf(slug: string) {
  const viewer = readMockViewer()
  if (slug === anna.slug || slug === String(anna.public_number)) {
    const is_own = viewer === 'author'
    return { ...anna, ...(is_own ? { user_id: 'a1000000-0000-4000-8000-000000000001' } : {}), is_own }
  }
  if (slug === profile.slug || slug === String(profile.public_number)) return { ...profile, is_own: viewer === 'member' }
  return null
}

export const profileHandlers = [
  http.get('*/v1/profiles/me/stats', () => HttpResponse.json({ view_count: 4, reaction_count: 1, followers_count: 2 })),
  http.get('*/v1/rating', () =>
    HttpResponse.json({
      items: [
        { user_id: ANNA, display_name: anna.display_name, avatar_url: null, slug: 'anna', reputation: 12 },
        { user_id: READER, display_name: profile.display_name, avatar_url: null, slug: 'reader', reputation: 0 },
      ],
      next_cursor: null,
    }),
  ),
  http.get('*/v1/profiles/:slug/articles', ({ params }) => {
    const found = profileOf(String(params.slug))
    if (!found) return HttpResponse.json({ code: 'not_found', title: 'Профиль не найден', status: 404 }, { status: 404 })
    const author = { user_id: found.user_id, display_name: found.display_name, avatar_url: found.avatar_url, slug: found.slug ?? String(found.public_number) }
    return HttpResponse.json({ items: [{ ...article, author }], next_cursor: null })
  }),
  http.get('*/v1/profiles/:slug/followers', () =>
    HttpResponse.json({
      items: [{ user_id: ANNA, display_name: anna.display_name, avatar_url: null, slug: 'anna', reputation: 12 }],
      next_cursor: null,
    }),
  ),
  http.get('*/v1/profiles/:slug/following', () => HttpResponse.json({ items: [], next_cursor: null })),
  http.get('*/v1/users/:user_id/comments', () => HttpResponse.json({ items: [comment], next_cursor: null })),
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
    profile.display_name = body.display_name
    profile.bio = body.bio
    profile.avatar_url = body.avatar_url
    profile.cover_url = body.cover_url
    profile.slug = body.slug
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

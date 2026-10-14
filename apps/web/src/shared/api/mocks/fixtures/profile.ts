/** Профили и записи, которые mock-обработчики профиля отдают и меняют на месте. */
export const READER = '0b3a4c50-3333-4c33-8c33-000000000005'
export const ANNA = '0b3a4c50-3333-4c33-8c33-000000000001'

export const profile = {
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

export const anna = {
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

export const article = {
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

export const comment = {
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

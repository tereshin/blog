import type { ArticleCardModel } from '../model/article-types.ts'

/** Данные историй: карточка с изображением, комментарием и реакциями; поля переопределяются. */
export function makeArticle(overrides: Partial<ArticleCardModel> = {}): ArticleCardModel {
  return {
    id: '9b2e3f40-2222-4b22-8b22-000000000001',
    slug: 'kursornaya-paginatsiya',
    title: 'Как мы переписали ленту на курсорную пагинацию',
    excerpt: 'Сначала лента тормозила на длинных списках, потом начала терять карточки при новых публикациях. Рассказываем, как мы это починили.',
    first_image_url: 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22720%22 height=%22405%22%3E%3Crect width=%22720%22 height=%22405%22 fill=%22%23566%22/%3E%3C/svg%3E',
    published_at: '2026-10-08T09:05:00.000Z',
    time_label: '09:05',
    author: { user_id: 'u1', display_name: 'Анна Авторова', avatar_url: null, slug: 'anna', href: '/u/anna' },
    topic: { id: 't1', title: 'Технологии', slug: 'tehnologii', status: 'active', href: '/t/tehnologii' },
    reaction_counts: { laugh: 3, heart: 12, thumb: 5, fire: 1 },
    reaction_count: 21,
    comment_count: 8,
    bookmark_count: 1500,
    view_count: 12_345,
    top_comment: { id: 'c1', author_name: 'Борис Писарев', author_avatar_url: null, excerpt: 'Главное — стабильный порядок: пара (дата, id) решает все гонки при вставке.' },
    visibility: 'public',
    comments_enabled: true,
    href: '/p/kursornaya-paginatsiya',
    ...overrides,
  }
}

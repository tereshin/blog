import { createArticleSchema, updateArticleSchema } from '@blog/contracts'
import type { BlocksDocument } from '@blog/contracts'
import { HttpResponse, http } from 'msw'
import {
  currentMockAuthor,
  hasMockContent,
  nextArticleSlug,
  readMockArticles,
  slugVerdict,
  writeMockArticles,
} from './articles-store.ts'
import type { MockArticle } from './articles-store.ts'

function problem(status: number, code: string, title: string, errors?: Record<string, unknown>) {
  return HttpResponse.json({ type: 'about:blank', title, status, code, ...(errors ? { errors } : {}) }, { status })
}

function draftOf(article: MockArticle) {
  return {
    id: article.id,
    title: article.title,
    blocks: article.blocks,
    topic_id: article.topic_id,
    visibility: article.visibility,
    comments_enabled: article.comments_enabled,
    slug: article.slug,
    status: article.status,
  }
}

function requireAuthor(kind: 'read' | 'change' | 'publish') {
  const author = currentMockAuthor()
  if (!author) return { author: null, error: problem(401, 'unauthorized', 'Требуется вход') }
  if (kind !== 'read' && author.is_restricted) return { author: null, error: problem(403, 'restricted', 'Учётная запись ограничена') }
  if (kind === 'publish' && !author.can_publish) return { author: null, error: problem(403, 'cannot_publish', 'Публикация пока недоступна') }
  return { author, error: null }
}

function applySlug(article: MockArticle | null, slug: string | undefined): { slug: string } | { error: Response } {
  if (!slug) return { slug: article?.slug ?? nextArticleSlug() }
  const verdict = slugVerdict(slug, article?.slug)
  if (verdict === 'reserved') return { error: problem(422, 'slug_reserved', 'Это служебное слово, выберите другой адрес') }
  if (verdict === 'taken') return { error: problem(409, 'slug_taken', 'Этот адрес уже занят') }
  if (verdict === 'invalid') return { error: problem(422, 'invalid', 'Короткий адрес не подходит') }
  return { slug }
}

function saveFields(
  article: MockArticle,
  fields: { title?: string; topic_id?: string; blocks?: BlocksDocument; visibility?: MockArticle['visibility']; comments_enabled?: boolean; slug?: string },
): MockArticle {
  return {
    ...article,
    ...(fields.title !== undefined ? { title: fields.title } : {}),
    ...(fields.topic_id !== undefined ? { topic_id: fields.topic_id } : {}),
    ...(fields.blocks !== undefined ? { blocks: fields.blocks } : {}),
    ...(fields.visibility !== undefined ? { visibility: fields.visibility } : {}),
    ...(fields.comments_enabled !== undefined ? { comments_enabled: fields.comments_enabled } : {}),
    ...(fields.slug !== undefined ? { slug: fields.slug } : {}),
  }
}

export const articleHandlers = [
  http.post('*/v1/articles', async ({ request }) => {
    const gate = requireAuthor('publish')
    if (!gate.author || gate.error) return gate.error
    const parsed = createArticleSchema.safeParse(await request.json())
    if (!parsed.success) return problem(422, 'invalid', 'Проверьте поля')
    const slug = applySlug(null, parsed.data.slug)
    if ('error' in slug) return slug.error
    const article: MockArticle = {
      id: crypto.randomUUID(),
      author_id: gate.author.id,
      author_name: gate.author.display_name,
      author_slug: gate.author.slug,
      title: parsed.data.title,
      blocks: parsed.data.blocks,
      topic_id: parsed.data.topic_id,
      visibility: parsed.data.visibility,
      comments_enabled: parsed.data.comments_enabled,
      slug: slug.slug,
      status: 'draft',
      published_at: null,
    }
    writeMockArticles([article, ...readMockArticles()])
    return HttpResponse.json(draftOf(article), { status: 201 })
  }),

  http.get('*/v1/me/articles', ({ request }) => {
    const gate = requireAuthor('read')
    if (!gate.author || gate.error) return gate.error
    const status = new URL(request.url).searchParams.get('status')
    if (status !== 'draft') return problem(422, 'invalid', 'Проверьте поля')
    const items = readMockArticles().filter((article) => article.author_id === gate.author?.id && article.status === 'draft')
    return HttpResponse.json({ items: items.map(draftOf) })
  }),

  http.get('*/v1/articles/:id/draft', ({ params }) => {
    const gate = requireAuthor('read')
    if (!gate.author || gate.error) return gate.error
    const article = readMockArticles().find((item) => item.id === params.id && item.author_id === gate.author?.id)
    if (!article) return problem(404, 'not_found', 'Черновик не найден')
    return HttpResponse.json(draftOf(article))
  }),

  http.patch('*/v1/articles/:id', async ({ params, request }) => {
    const gate = requireAuthor('change')
    if (!gate.author || gate.error) return gate.error
    const articles = readMockArticles()
    const current = articles.find((item) => item.id === params.id && item.author_id === gate.author?.id && item.status !== 'deleted')
    if (!current) return problem(404, 'not_found', 'Статья не найдена')
    const parsed = updateArticleSchema.safeParse(await request.json())
    if (!parsed.success) return problem(422, 'invalid', 'Проверьте поля')
    const slug = parsed.data.slug === undefined ? { slug: current.slug } : applySlug(current, parsed.data.slug)
    if ('error' in slug) return slug.error
    const next = saveFields(current, { ...parsed.data, slug: slug.slug })
    writeMockArticles(articles.map((item) => (item.id === next.id ? next : item)))
    return HttpResponse.json(draftOf(next))
  }),

  http.post('*/v1/articles/:id/publish', ({ params }) => {
    const gate = requireAuthor('publish')
    if (!gate.author || gate.error) return gate.error
    const articles = readMockArticles()
    const current = articles.find((item) => item.id === params.id && item.author_id === gate.author?.id && item.status !== 'deleted')
    if (!current) return problem(404, 'not_found', 'Статья не найдена')
    const reasons = [
      ...(current.title.trim() ? [] : ['title']),
      ...(current.topic_id ? [] : ['topic']),
      ...(hasMockContent(current.blocks) ? [] : ['content']),
    ]
    if (reasons.length > 0) return problem(422, 'not_publishable', 'Статью пока нельзя опубликовать', { reasons })
    const next: MockArticle = {
      ...current,
      status: 'published',
      published_at: current.published_at ?? new Date().toISOString(),
    }
    writeMockArticles(articles.map((item) => (item.id === next.id ? next : item)))
    return HttpResponse.json(draftOf(next))
  }),

  http.delete('*/v1/articles/:id', ({ params }) => {
    const gate = requireAuthor('change')
    if (!gate.author || gate.error) return gate.error
    const articles = readMockArticles()
    const current = articles.find((item) => item.id === params.id && item.author_id === gate.author?.id && item.status !== 'deleted')
    if (!current) return problem(404, 'not_found', 'Статья не найдена')
    const next: MockArticle = { ...current, status: 'deleted', slug: `deleted-${current.id}` }
    writeMockArticles(articles.map((item) => (item.id === next.id ? next : item)))
    return new HttpResponse(null, { status: 204 })
  }),
]

import { describe, expect, it } from 'vitest'
import { DEFAULT_SEO_SETTINGS, DEFAULT_SOCIAL_COVER_SETTINGS, pageSeoSchema } from '@blog/contracts'
import { createSeoService, plainText, shortDescription } from '../../src/modules/seo/index.ts'
import type { SeoArticle, SeoRepository, SeoSite } from '../../src/modules/seo/index.ts'

const site: SeoSite = { name: 'Площадка', locale: 'ru', logo_url: null, seo: DEFAULT_SEO_SETTINGS, social_cover: DEFAULT_SOCIAL_COVER_SETTINGS }
const article: SeoArticle = { id: '00000000-0000-4000-8000-000000000001', slug: 'public-post', title: 'Заголовок', seo_title: null, seo_description: null, excerpt: '<b>Описание</b> &amp; текст', first_image_url: null, blocks: { time: 1, version: '2.28.0', blocks: [{ type: 'paragraph', data: { text: 'Текст &lt;script&gt;' } }] }, status: 'published', visibility: 'public', published_at: new Date('2026-10-01'), updated_at: new Date('2026-10-02'), author_name: 'Ђорђе', author_slug: 'author', author_number: 1, topic_title: 'Тема', topic_slug: 'topic' }
function service(overrides: Partial<SeoRepository> = {}, app_env: 'prod' | 'local' | 'dev' = 'prod') {
  const repository: SeoRepository = { site: async () => site, article: async (slug) => slug === article.slug ? article : null, profile: async () => ({ display_name: 'Автор', bio: '<p>Биография &amp; текст</p>', avatar_url: null, slug: 'author', public_number: 1, created_at: new Date('2026-01-01') }), topic: async () => ({ title: 'Тема', description: null, cover_url: null, slug: 'topic' }), covers: async () => null, ...overrides }
  return createSeoService(repository, { public_origin: 'https://blog.example', app_env })
}
describe('SEO: матрица доступа и связанный граф', () => {
  it.each(['/', '/popular', '/discovery', '/discovery/blogs', '/discovery/topics', '/t/topic', '/u/author', '/p/public-post'])('индексирует %s и соблюдает общий контракт', async (path) => {
    const result = pageSeoSchema.parse(await service().page(path + '?utm_source=test'))
    expect(result.robots).toBe('index, follow')
    expect(result.canonical_url).not.toContain('?')
    expect(result.structured_data['@graph'].map((node) => node['@type'])).toContain('BreadcrumbList')
  })
  it.each(['/feed', '/search', '/bookmarks', '/messages', '/messages/new', '/write', '/admin/settings', '/auth/action', '/u/author/followers', '/u/author/following'])('не индексирует %s', async (path) => expect((await service().page(path)).robots).toBe('noindex, follow'))
  it.each(['/discovery?q=hello', '/discovery?q=', '/search?q=hello', '/rating'])('не индексирует поиск и старые адреса %s', async (path) => {
    const result = await service().page(path)
    expect(result.status).toBe(200)
    expect(result.robots).toBe('noindex, follow')
    expect(result.canonical_url).toBe(`https://blog.example${path.startsWith('/rating') ? '/discovery/blogs' : '/discovery'}`)
  })
  it('сохраняет прежние SEO-настройки для главной Discovery', async () => {
    const result = await service({ site: async () => ({ ...site, seo: { ...site.seo, pages: { ...site.seo.pages, rating: { title: 'Найдите блог', description: 'Блоги и темы' } } } }) }).page('/discovery')
    expect(result.title).toBe('Найдите блог — Площадка')
    expect(result.description).toBe('Блоги и темы')
    expect((await service().page('/discovery/topics')).title).toBe('Темы — Площадка')
  })
  it.each(['draft', 'hidden', 'deleted'] as const)('не раскрывает %s', async (status) => {
    const result = await service({ article: async () => ({ ...article, status }) }).page('/p/public-post')
    expect(result.body_text).toBe('')
    expect(result.robots).toBe('noindex, follow')
    expect(JSON.stringify(result)).not.toContain('Заголовок')
    expect(JSON.stringify(result)).not.toContain('BlogPosting')
  })
  it.each(['members', 'author'] as const)('не раскрывает доступ %s', async (visibility) => {
    const result = await service({ article: async () => ({ ...article, visibility }) }).page('/p/public-post')
    expect(JSON.stringify(result)).not.toContain('Заголовок')
    expect(result.images).toBeNull()
  })
  it.each(['/about', '/p/unknown', '/unknown', '//evil.example', 'https://evil.example', '/admin/unknown', '/p/%ZZ'])('404 для %s', async (path) => expect((await service().page(path)).status).toBe(404))
  it('канонизирует номер профиля на slug и связывает Person', async () => {
    const result = await service().page('/u/1')
    expect(result.canonical_url).toBe('https://blog.example/u/author')
    expect(result.structured_data['@graph'].find((node) => node['@type'] === 'ProfilePage')?.mainEntity).toEqual({ '@id': 'https://blog.example/u/author#person' })
  })
  it('использует SEO поля и фактические даты, сохраняет видимый заголовок в статье', async () => {
    const result = await service({ article: async () => ({ ...article, seo_title: 'SEO заголовок', seo_description: 'SEO описание' }) }).page('/p/public-post')
    expect(result.title).toBe('SEO заголовок — Площадка')
    expect(result.description).toBe('SEO описание')
    expect(result.published_at).toBe('2026-10-01T00:00:00.000Z')
    expect(result.structured_data['@graph'].find((node) => node['@type'] === 'BlogPosting')).toMatchObject({ headline: 'Заголовок', author: { url: 'https://blog.example/u/author', name: 'Ђорђе' } })
  })
  it.each(['local', 'dev'] as const)('отключает индексацию в %s', async (env) => expect((await service({}, env).page('/')).robots).toBe('noindex, follow'))
  it('отключает индексацию глобальным переключателем', async () => expect((await service({ site: async () => ({ ...site, seo: { ...site.seo, indexing_enabled: false } }) }).page('/')).robots).toBe('noindex, follow'))
  it('пробрасывает ошибку данных, не подменяя её успешной нейтральной страницей', async () => expect(service({ article: async () => { throw new Error('Database unavailable') } }).page('/p/public-post')).rejects.toThrow('Database unavailable'))
  it('удаляет HTML, декодирует сущности и режет описание по Unicode', () => {
    expect(plainText('<p>Привет &amp; &#x40; &lt;мир&gt;</p>')).toBe('Привет & @ <мир>')
    expect(Array.from(shortDescription('😀'.repeat(200))).length).toBeLessThanOrEqual(160)
  })
})

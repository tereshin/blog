import type { BlocksDocument } from '@blog/contracts'
import type { FeedCardFixture } from '../fixtures/feed.ts'
import session_fixtures from '../fixtures/session.json'
import topics_fixture from '../fixtures/topics.json'
import { readMockViewer } from './session.ts'

const STORAGE_KEY = 'mock_articles'

const RESERVED_SLUGS = new Set([
  'new',
  'edit',
  'admin',
  'api',
  'write',
  'me',
  'about',
  'rating',
  'bookmarks',
  'search',
  'settings',
  'topics',
  'p',
  'u',
  't',
])

export type MockArticle = {
  id: string
  author_id: string
  author_name: string
  author_slug: string
  title: string
  blocks: BlocksDocument
  topic_id: string
  visibility: 'public' | 'members' | 'author'
  comments_enabled: boolean
  slug: string
  status: 'draft' | 'published' | 'hidden' | 'deleted'
  published_at: string | null
}

export type MockAuthor = {
  id: string
  can_publish: boolean
  is_restricted: boolean
  display_name: string
  slug: string
}

function isArticle(value: unknown): value is MockArticle {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Partial<MockArticle>
  return (
    typeof row.id === 'string' &&
    typeof row.slug === 'string' &&
    typeof row.status === 'string' &&
    typeof row.author_id === 'string' &&
    typeof row.author_name === 'string' &&
    typeof row.author_slug === 'string'
  )
}

/** Черновики живут в sessionStorage: полный переход пересоздаёт модуль, а вкладка — нет. */
export function readMockArticles(): MockArticle[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isArticle) : []
  } catch {
    return []
  }
}

export function writeMockArticles(articles: MockArticle[]): void {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(articles))
}

export function currentMockAuthor(): MockAuthor | null {
  const session = session_fixtures[readMockViewer()]
  if (!('user' in session)) return null
  return {
    id: session.user.id,
    can_publish: session.user.can_publish,
    is_restricted: session.user.is_restricted,
    display_name: session.profile.display_name,
    slug: session.profile.slug,
  }
}

export function slugVerdict(slug: string, own_slug?: string): 'ok' | 'invalid' | 'reserved' | 'taken' {
  if (slug.length < 3 || slug.length > 40 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'invalid'
  if (RESERVED_SLUGS.has(slug)) return 'reserved'
  const taken = readMockArticles().some((article) => article.slug === slug && article.slug !== own_slug && article.status !== 'deleted')
  return taken ? 'taken' : 'ok'
}

export function nextArticleSlug(): string {
  const taken = new Set(readMockArticles().map((article) => article.slug))
  let number = taken.size + 1
  let slug = `zametka-${number}`
  while (taken.has(slug) || RESERVED_SLUGS.has(slug)) {
    number += 1
    slug = `zametka-${number}`
  }
  return slug
}

function plain(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim()
}

function excerptOf(blocks: BlocksDocument): string {
  for (const block of blocks.blocks) {
    if (block.type === 'paragraph' || block.type === 'header') {
      const text = plain(block.data.text)
      if (text) return text.slice(0, 200)
    }
  }
  return ''
}

function imageOf(blocks: BlocksDocument): string | null {
  for (const block of blocks.blocks) {
    if (block.type === 'image') return block.data.file.url
  }
  return null
}

export function hasMockContent(blocks: BlocksDocument): boolean {
  return blocks.blocks.some((block) => {
    switch (block.type) {
      case 'paragraph':
      case 'header':
        return plain(block.data.text).length > 0
      case 'quote':
        return plain(block.data.text).length > 0 || plain(block.data.caption ?? '').length > 0
      case 'warning':
        return plain(block.data.title).length > 0 || plain(block.data.message).length > 0
      case 'list':
        return block.data.items.length > 0
      case 'code':
        return block.data.code.trim().length > 0
      case 'table':
        return block.data.content.some((row) => row.some((cell) => plain(cell).length > 0))
      case 'image':
      case 'embed':
      case 'attaches':
      case 'personality':
        return true
      case 'delimiter':
        return false
    }
  })
}

/** Опубликованные статьи этой вкладки впереди фикстурной ленты. Черновики в ленту не попадают. */
export function publishedFeedCards(): FeedCardFixture[] {
  const viewer = currentMockAuthor()
  return readMockArticles()
    .filter((article) => {
      if (article.status !== 'published' || !article.published_at) return false
      if (article.visibility === 'author') return viewer?.id === article.author_id
      if (article.visibility === 'members') return viewer !== null
      return true
    })
    .map((article): FeedCardFixture | null => {
      const fallback = topics_fixture[0]
      const found = topics_fixture.find((item) => item.id === article.topic_id) ?? fallback
      if (!found) return null
      const author = { id: article.author_id, display_name: article.author_name, slug: article.author_slug }
      return {
        id: article.id,
        slug: article.slug,
        title: article.title,
        excerpt: excerptOf(article.blocks),
        first_image_url: imageOf(article.blocks),
        published_at: article.published_at ?? new Date(0).toISOString(),
        author: { user_id: author.id, display_name: author.display_name, avatar_url: null, slug: author.slug },
        topic: { id: found.id, title: found.title, slug: found.slug, status: found.status === 'archived' ? 'archived' : 'active' },
        reaction_counts: { laugh: 0, heart: 0, thumb: 0, fire: 0 },
        reaction_count: 0,
        comment_count: 0,
        bookmark_count: 0,
        view_count: 0,
        top_comment: null,
        visibility: article.visibility,
        comments_enabled: article.comments_enabled,
      }
    })
    .filter((card) => card !== null)
}
